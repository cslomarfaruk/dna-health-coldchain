import crypto from 'crypto';

const BASE_URL = 'http://localhost:3001';

async function runSmartOAuthTestSuite() {
  console.log('--- INTEGRATION TEST: SMART on FHIR OAuth 2.0 PKCE (RFC 7636) ---');

  // Test 1: SMART Configuration Discovery Endpoint
  console.log('Test 1: Querying SMART Configuration Discovery (/.well-known/smart-configuration)...');
  const discRes = await fetch(`${BASE_URL}/.well-known/smart-configuration`);
  if (!discRes.ok) {
    throw new Error(`Discovery endpoint failed with HTTP ${discRes.status}`);
  }
  const config = (await discRes.json()) as any;
  console.log(`  ✓ Capabilities: ${config.capabilities.slice(0, 4).join(', ')}...`);
  console.log(`  ✓ Supported Code Challenge Methods: ${config.code_challenge_methods_supported.join(', ')}`);

  if (!config.code_challenge_methods_supported.includes('S256')) {
    throw new Error('SMART discovery must advertise S256 PKCE support!');
  }
  if (!config.token_endpoint || !config.authorization_endpoint) {
    throw new Error('SMART discovery missing required OAuth endpoints!');
  }

  // Test 2: Authorize endpoint with S256 PKCE parameters
  console.log('Test 2: Requesting authorization code with PKCE code_challenge...');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const launchContext = 'patient:MRN-849201';

  const authUrl = `${BASE_URL}/oauth/authorize?response_type=code&client_id=dna-health-dispensary&redirect_uri=http://localhost:5173/callback&code_challenge=${codeChallenge}&code_challenge_method=S256&launch=${encodeURIComponent(launchContext)}&username=pharm_vance&password=PharmPass123!`;
  
  const authRes = await fetch(authUrl);
  if (!authRes.ok) {
    throw new Error(`Authorize request failed with HTTP ${authRes.status}: ${await authRes.text()}`);
  }
  const authData = (await authRes.json()) as any;
  const authCode = authData.code;
  console.log(`  ✓ Authorization code issued: ${authCode.slice(0, 24)}... (Linked to patient context: ${launchContext})`);

  // Test 3: Security Gate - Tampered code_verifier MUST fail PKCE validation (HTTP 400)
  console.log('Test 3: Security Gate - Tampered PKCE code_verifier must be rejected (HTTP 400)...');
  const badAuthRes = await fetch(authUrl);
  const badAuthData = (await badAuthRes.json()) as any;
  const badAuthCode = badAuthData.code;

  const badTokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: badAuthCode,
      client_id: 'dna-health-dispensary',
      code_verifier: 'invalid-tampered-verifier-not-matching-s256-hash',
    }),
  });

  if (badTokenRes.status !== 400) {
    throw new Error(`CRITICAL SECURITY FLAW: Server accepted invalid PKCE verifier with HTTP ${badTokenRes.status}`);
  }
  const badData = (await badTokenRes.json()) as any;
  console.log(`  ✓ Rejected tampered PKCE verifier safely: ${badData.error} (${badData.message || badData.error_description})`);

  // Test 4: Token Exchange with authentic code_verifier (S256 Verified)
  console.log('Test 4: Token Exchange with valid S256 code_verifier...');
  const goodAuthRes = await fetch(authUrl);
  const goodAuthData = (await goodAuthRes.json()) as any;
  const goodAuthCode = goodAuthData.code;

  const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: goodAuthCode,
      client_id: 'dna-health-dispensary',
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed with HTTP ${tokenRes.status}: ${await tokenRes.text()}`);
  }
  const tokenData = (await tokenRes.json()) as any;
  console.log(`  ✓ Access token issued: type="${tokenData.token_type}", expires_in=${tokenData.expires_in}s`);
  console.log(`  ✓ Patient context attached: patient="${tokenData.patient}"`);

  if (!tokenData.access_token || tokenData.token_type !== 'Bearer') {
    throw new Error('Token response missing Bearer access_token!');
  }
  if (tokenData.patient !== 'MRN-849201') {
    throw new Error(`Expected patient MRN-849201, got ${tokenData.patient}`);
  }

  // Test 5: Replay Protection - Authorization codes are single-use
  console.log('Test 5: Replay Protection - Re-using consumed authorization code must fail...');
  const replayRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: goodAuthCode,
      client_id: 'dna-health-dispensary',
      code_verifier: codeVerifier,
    }),
  });
  if (replayRes.status !== 400) {
    throw new Error(`CRITICAL REPLAY FLAW: Re-used authorization code succeeded with HTTP ${replayRes.status}`);
  }
  console.log('  ✓ Single-use code enforcement verified: replayed code rejected safely');

  // Test 6: Authenticated Resource Access with SMART Token
  console.log('Test 6: Querying protected clinical EHR API using SMART Bearer token...');
  const apiRes = await fetch(`${BASE_URL}/api/indents`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });
  if (!apiRes.ok) {
    throw new Error(`Protected API call failed with HTTP ${apiRes.status}`);
  }
  const indents = (await apiRes.json()) as any;
  console.log(`  ✓ Successfully accessed protected clinical API (${indents.length} indents retrieved)`);

  console.log('✓ All SMART on FHIR OAuth 2.0 PKCE integration tests passed!\n');
}

runSmartOAuthTestSuite().catch((err) => {
  console.error('✕ SMART on FHIR OAuth PKCE test failed:', err.message);
  process.exit(1);
});
