import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db';
import { JWT_SECRET } from '../../middleware/auth';
import { phiSafeLog } from '../../middleware/phiLogger';

export const smartOAuthRouter = Router();

// Store active authorization codes and PKCE challenges in-memory with short TTL (5 mins)
interface AuthCodeEntry {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  userId: string;
  userRole: string;
  patientContext: string;
  scope: string;
  expiresAt: number;
}

const authCodeStore = new Map<string, AuthCodeEntry>();

// Clean expired codes every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of authCodeStore.entries()) {
    if (entry.expiresAt < now) {
      authCodeStore.delete(code);
    }
  }
}, 60000);

/**
 * Base64URL encoding helper for PKCE
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Validates PKCE S256 code verifier against code challenge
 * RFC 7636 Section 4.6: BASE64URL(SHA256(ASCII(code_verifier))) == code_challenge
 */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) return false;
  const hash = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest();
  const calculatedChallenge = base64UrlEncode(hash);
  return calculatedChallenge === codeChallenge;
}

/**
 * SMART on FHIR Configuration Discovery Endpoint
 * Standard: GET /.well-known/smart-configuration
 */
export function getSmartConfiguration(req: Request, res: Response): void {
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol || 'http';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [
      'openid',
      'fhirUser',
      'launch',
      'launch/patient',
      'patient/*.read',
      'patient/MedicationRequest.read',
      'patient/MedicationDispense.read',
      'user/*.read',
      'user/MedicationDispense.write',
      'offline_access',
    ],
    capabilities: [
      'launch-ehr',
      'launch-standalone',
      'client-public',
      'client-confidential-symmetric',
      'context-ehr-patient',
      'context-standalone-patient',
      'permission-patient',
      'permission-user',
    ],
  });
}

/**
 * SMART on FHIR OAuth 2.0 Authorization Endpoint
 * Handles authorization request with PKCE and patient launch context
 */
smartOAuthRouter.get('/authorize', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      response_type,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      launch,
      username,
      password,
    } = req.query as Record<string, string>;

    // Validate standard SMART parameters
    if (response_type !== 'code') {
      res.status(400).json({ error: 'unsupported_response_type', message: 'Only response_type=code is supported.' });
      return;
    }

    if (!code_challenge) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'PKCE code_challenge is required for SMART on FHIR compliance (RFC 7636).',
      });
      return;
    }

    if (code_challenge_method && code_challenge_method !== 'S256') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Only code_challenge_method=S256 is permitted for healthcare PKCE.',
      });
      return;
    }

    // Determine user session or authenticating user
    let user: any = null;
    if (username && password) {
      user = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'access_denied', message: 'Invalid healthcare credentials.' });
        return;
      }
    } else {
      // Default to standard clinical practitioner context for standalone EHR launch
      user = await prisma.user.findFirst({ where: { role: 'PHARMACIST' } });
    }

    if (!user) {
      res.status(500).json({ error: 'server_error', message: 'No clinical practitioner available.' });
      return;
    }

    // Determine patient context from launch token or default to Elizabeth Warren (MRN-849201)
    const patientContext = launch ? `MRN-${launch.replace(/[^0-9]/g, '').slice(-6) || '849201'}` : 'MRN-849201';

    // Generate secure authorization code
    const authCode = `smart_code_${crypto.randomBytes(24).toString('hex')}`;
    authCodeStore.set(authCode, {
      code: authCode,
      clientId: client_id || 'dna-health-inpatient-app',
      redirectUri: redirect_uri || 'http://localhost:5173/smart/callback',
      codeChallenge: code_challenge,
      codeChallengeMethod: 'S256',
      userId: user.id,
      userRole: user.role,
      patientContext,
      scope: scope || 'launch/patient patient/*.read user/*.read openid fhirUser',
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes TTL
    });

    phiSafeLog('INFO', `SMART on FHIR Authorization Code issued for practitioner: ${user.username}, patient: ${patientContext}`);

    // If redirected by browser, redirect with code and state; otherwise return JSON for programmatic clients
    if (redirect_uri && req.headers.accept?.includes('text/html')) {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);
      res.redirect(redirectUrl.toString());
      return;
    }

    res.json({
      code: authCode,
      state: state || null,
      patient: patientContext,
      scope: scope || 'launch/patient patient/*.read user/*.read openid fhirUser',
    });
  } catch (err: any) {
    phiSafeLog('ERROR', 'SMART authorize error', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

/**
 * SMART on FHIR OAuth 2.0 Token Endpoint with PKCE Verification
 * Validates code_verifier against code_challenge (RFC 7636)
 */
smartOAuthRouter.post('/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

    if (grant_type !== 'authorization_code') {
      res.status(400).json({
        error: 'unsupported_grant_type',
        message: 'Grant type must be "authorization_code".',
      });
      return;
    }

    if (!code) {
      res.status(400).json({ error: 'invalid_request', message: 'Authorization code is required.' });
      return;
    }

    const entry = authCodeStore.get(code);
    if (!entry) {
      res.status(400).json({
        error: 'invalid_grant',
        message: 'Authorization code is invalid, expired, or already used.',
      });
      return;
    }

    // Immediately consume the authorization code (single-use constraint)
    authCodeStore.delete(code);

    if (entry.expiresAt < Date.now()) {
      res.status(400).json({ error: 'invalid_grant', message: 'Authorization code has expired.' });
      return;
    }

    // CRITICAL SECURITY: Verify PKCE S256 Code Verifier
    if (!code_verifier) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'PKCE code_verifier is mandatory for SMART on FHIR authorization code exchange.',
      });
      return;
    }

    const isPkceValid = verifyCodeChallenge(code_verifier, entry.codeChallenge);
    if (!isPkceValid) {
      phiSafeLog('WARN', `PKCE Verification FAILED for code: ${code}`);
      res.status(400).json({
        error: 'invalid_grant',
        message: 'PKCE validation failed: code_verifier does not match code_challenge (RFC 7636).',
      });
      return;
    }

    // Fetch user details to generate signed JWT
    const user = await prisma.user.findUnique({ where: { id: entry.userId } });
    if (!user) {
      res.status(400).json({ error: 'invalid_grant', message: 'User record no longer exists.' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      practitionerId: user.practitionerId,
      patientContext: entry.patientContext,
      scope: entry.scope,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    // Log authentic AuditEvent for SMART on FHIR PKCE login
    await prisma.auditRecord.create({
      data: {
        eventType: 'SMART_OAUTH_PKCE_AUTHENTICATED',
        action: 'E',
        outcome: '0',
        outcomeDescription: `User ${user.username} (${user.role}) authenticated via SMART on FHIR PKCE OAuth 2.0. Patient context: ${entry.patientContext}`,
        userId: user.id,
        userRole: user.role,
        entityReference: `Patient/${entry.patientContext}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    phiSafeLog('INFO', `SMART on FHIR PKCE authentication SUCCESSFUL for user: ${user.username}`);

    // Return standard SMART on FHIR Token Response
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 28800, // 8 hours
      scope: entry.scope,
      patient: entry.patientContext,
      need_patient_banner: true,
      smart_style_url: '/smart/style.json',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        practitionerId: user.practitionerId,
        email: user.email,
      },
    });
  } catch (err: any) {
    phiSafeLog('ERROR', 'SMART token error', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});
