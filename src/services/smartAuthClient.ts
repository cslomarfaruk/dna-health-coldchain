/**
 * SMART on FHIR OAuth 2.0 PKCE Client (RFC 7636)
 * Implements cryptographic Proof Key for Code Exchange (S256)
 * Never stores cleartext tokens in localStorage (in-memory token management)
 */

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a high-entropy cryptographic code_verifier (RFC 7636 Section 4.1)
 */
export function generateCodeVerifier(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node test environments
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Computes S256 code_challenge from code_verifier (RFC 7636 Section 4.2)
 * code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  if (cryptoObj && cryptoObj.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await cryptoObj.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
  }
  throw new Error('Web Cryptography API (crypto.subtle) is required for PKCE code challenge generation.');
}

export interface SmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  patient?: string;
  need_patient_banner?: boolean;
  smart_style_url?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'NURSE' | 'PHARMACIST' | 'AUDITOR' | 'ADMIN';
    practitionerId?: string;
    email?: string;
  };
}

/**
 * Executes a full SMART on FHIR OAuth 2.0 PKCE launch flow
 * 1. Generates code_verifier and S256 code_challenge
 * 2. Requests authorization code from /oauth/authorize
 * 3. Exchanges authorization code at /oauth/token with code_verifier
 */
export async function executeSmartPkceAuth(
  credentials: { username: string; password?: string },
  patientContext: string = 'MRN-849201',
  baseUrl: string = ''
): Promise<SmartTokenResponse> {
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // 1. Authorize: Request authorization code with PKCE challenge
  const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`, window.location.origin);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', 'dna-health-inpatient-app');
  authorizeUrl.searchParams.set('redirect_uri', `${window.location.origin}/smart/callback`);
  authorizeUrl.searchParams.set('scope', 'launch/patient patient/*.read user/*.read openid fhirUser');
  authorizeUrl.searchParams.set('state', `state_${Date.now()}`);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('launch', patientContext);
  authorizeUrl.searchParams.set('username', credentials.username);
  if (credentials.password) {
    authorizeUrl.searchParams.set('password', credentials.password);
  }

  const authRes = await fetch(authorizeUrl.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!authRes.ok) {
    const err = await authRes.json().catch(() => ({ message: `HTTP ${authRes.status}` }));
    throw new Error(err.message || 'SMART on FHIR authorization failed');
  }

  const { code } = await authRes.json();

  // 2. Token Exchange: Send code_verifier to redeem access token
  const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: 'dna-health-inpatient-app',
      redirect_uri: `${window.location.origin}/smart/callback`,
      code_verifier: codeVerifier, // Proves possession of secret verifier without exposing on wire in step 1
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({ message: `HTTP ${tokenRes.status}` }));
    throw new Error(err.message || 'SMART on FHIR token redemption failed');
  }

  const tokenData: SmartTokenResponse = await tokenRes.json();
  return tokenData;
}
