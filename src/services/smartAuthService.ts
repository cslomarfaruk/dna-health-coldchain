// SMART on FHIR OAuth 2.0 PKCE (RFC 7636) auth service.
// Implements client-side PKCE S256 exchange with mock session management and scope enforcement.

import { SmartAuthSession, SmartClinicianIdentity } from '../types/clinical';

// Universal Base64URL helper compatible with browser Web Crypto & Node.js
export function bufferToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' 
    ? btoa(binary) 
    : ((globalThis as any).Buffer?.from(binary, 'binary').toString('base64') ?? '');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a high-entropy PKCE code_verifier (RFC 7636 Section 4.1)
 */
export function generateCodeVerifier(length = 64): string {
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback pseudo-random for minimal headless runtimes
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return bufferToBase64Url(array);
}

/**
 * Generates the PKCE code_challenge using SHA-256 (code_challenge_method = 'S256')
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  if (globalThis.crypto?.subtle?.digest) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return bufferToBase64Url(new Uint8Array(hashBuffer));
  }

  // Fallback for minimal environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < codeVerifier.length; i++) {
    hash = ((hash << 5) - hash) + codeVerifier.charCodeAt(i);
    hash |= 0;
  }
  return bufferToBase64Url(encoder.encode(`fallback_hash_${Math.abs(hash)}`));
}

export const DEFAULT_CLINICIAN: SmartClinicianIdentity = {
  practitionerId: 'Practitioner/PHARM-4401',
  fullName: 'Dr. Elena Vance, PharmD',
  role: 'Clinical Staff Pharmacist (Inpatient Dispensary)',
  npi: '1942857103',
  organization: 'DNA Health Central Inpatient Hospital',
  email: 'elena.vance@dnahealth.internal',
};

export const SMART_CONFIG = {
  clientId: 'dna-health-cold-chain-dispensary',
  redirectUri: 'http://localhost:5173/smart/callback',
  authUrl: 'https://ehr.dnahealth.internal/oauth2/authorize',
  tokenUrl: 'https://ehr.dnahealth.internal/oauth2/token',
  scopes: [
    'openid',
    'fhirUser',
    'launch/patient',
    'patient/MedicationRequest.read',
    'patient/MedicationDispense.write',
    'offline_access',
  ],
};

/**
 * Builds a structured, verifiable JWT Bearer Token representation
 */
function buildMockJwtToken(
  clinician: SmartClinicianIdentity,
  patientId: string,
  scopes: string[],
  expiresInSec: number
): { token: string; exp: string } {
  const now = Math.floor(Date.now() / 1000);
  const expTimestamp = now + expiresInSec;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: 'dna-ehr-key-2026',
  };

  const payload = {
    iss: 'https://ehr.dnahealth.internal/oauth2',
    sub: clinician.practitionerId,
    aud: 'https://ehr.dnahealth.internal/baseR4',
    client_id: SMART_CONFIG.clientId,
    patient: patientId,
    name: clinician.fullName,
    role: clinician.role,
    npi: clinician.npi,
    scope: scopes.join(' '),
    iat: now,
    exp: expTimestamp,
  };

  const encHeader = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const rawSig = `sig_${Date.now()}_sha256_${encHeader.slice(0, 8)}_${encPayload.slice(-8)}`;
  const encSig = bufferToBase64Url(new TextEncoder().encode(rawSig));

  return {
    token: `${encHeader}.${encPayload}.${encSig}`,
    exp: new Date(expTimestamp * 1000).toISOString(),
  };
}

// Active singleton session
let currentSession: SmartAuthSession | null = null;
const sessionListeners: Array<(session: SmartAuthSession | null) => void> = [];

export function subscribeToAuthChanges(callback: (session: SmartAuthSession | null) => void) {
  sessionListeners.push(callback);
  return () => {
    const idx = sessionListeners.indexOf(callback);
    if (idx !== -1) sessionListeners.splice(idx, 1);
  };
}

function notifyListeners() {
  for (const cb of sessionListeners) {
    cb(currentSession);
  }
}

/**
 * Initializes or performs a SMART on FHIR PKCE Launch Handshake
 */
export async function authenticateWithSmartPkce(
  patientId: string = 'Patient/MRN-849201',
  clinician: SmartClinicianIdentity = DEFAULT_CLINICIAN
): Promise<SmartAuthSession> {
  const startTime = Date.now();

  // 1. Generate high-entropy code_verifier & SHA-256 code_challenge
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // 2. Simulate authorization code exchange
  const tokenDurationSec = 3600; // 1 hour access token
  const { token, exp } = buildMockJwtToken(clinician, patientId, SMART_CONFIG.scopes, tokenDurationSec);

  const exchangeLatencyMs = Date.now() - startTime;

  currentSession = {
    isAuthenticated: true,
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: tokenDurationSec,
    issuedAt: new Date().toISOString(),
    expiresAt: exp,
    grantedScopes: [...SMART_CONFIG.scopes],
    patientContextId: patientId,
    user: clinician,
    pkceHandshake: {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
      exchangeLatencyMs,
    },
    revoked: false,
  };

  notifyListeners();
  return currentSession;
}

/**
 * Gets the current active SMART on FHIR session
 */
export function getAuthSession(): SmartAuthSession {
  if (!currentSession) {
    // Generate a default valid session on demand if not yet booted
    const now = Math.floor(Date.now() / 1000);
    const { token, exp } = buildMockJwtToken(
      DEFAULT_CLINICIAN,
      'Patient/MRN-849201',
      SMART_CONFIG.scopes,
      3600
    );
    currentSession = {
      isAuthenticated: true,
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      issuedAt: new Date().toISOString(),
      expiresAt: exp,
      grantedScopes: [...SMART_CONFIG.scopes],
      patientContextId: 'Patient/MRN-849201',
      user: DEFAULT_CLINICIAN,
      pkceHandshake: {
        codeVerifier: 'cf_d829fa7b4e6c1a890e3d2c1b4a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a10',
        codeChallenge: 'Qq1fGD0HhxwbmeMrqaebgn1qhvKeguQPXqLdpmixaM4',
        codeChallengeMethod: 'S256',
        exchangeLatencyMs: 42,
      },
      revoked: false,
    };
  }
  return currentSession;
}

/**
 * Returns the RFC 6750 Bearer Authorization Header
 * Throws an error if the session is invalid or revoked
 */
export function getAuthorizationHeader(): string {
  const session = getAuthSession();
  if (!session.isAuthenticated || session.revoked) {
    throw new Error('Unauthorized: No active SMART on FHIR OAuth 2.0 session.');
  }
  return `Bearer ${session.accessToken}`;
}

/**
 * Validates whether the active session has a specific FHIR scope
 */
export function hasRequiredScope(scope: string): boolean {
  const session = getAuthSession();
  if (!session.isAuthenticated || session.revoked) return false;
  return session.grantedScopes.includes(scope);
}

/**
 * Simulates a token revocation / expired state for testing 401 Unauthorized handling
 */
export function simulateTokenRevocation(): void {
  if (currentSession) {
    currentSession = {
      ...currentSession,
      isAuthenticated: false,
      revoked: true,
    };
  } else {
    currentSession = {
      isAuthenticated: false,
      accessToken: '',
      tokenType: 'Bearer',
      expiresIn: 0,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      grantedScopes: [],
      patientContextId: '',
      user: DEFAULT_CLINICIAN,
      pkceHandshake: {
        codeVerifier: '',
        codeChallenge: '',
        codeChallengeMethod: 'S256',
        exchangeLatencyMs: 0,
      },
      revoked: true,
    };
  }
  notifyListeners();
}

/**
 * Refreshes the token and generates a fresh PKCE challenge
 */
export async function simulateTokenRefresh(patientId?: string): Promise<SmartAuthSession> {
  return authenticateWithSmartPkce(patientId || currentSession?.patientContextId || 'Patient/MRN-849201');
}
