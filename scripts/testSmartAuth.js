// Tests for SMART on FHIR OAuth 2.0 PKCE auth and token revocation.
import {
  authenticateWithSmartPkce,
  getAuthorizationHeader,
  hasRequiredScope,
  simulateTokenRevocation,
  simulateTokenRefresh,
  generateCodeVerifier,
  generateCodeChallenge,
} from '../src/services/smartAuthService';

import {
  queryEhrMedicationRequest,
  submitMedicationDispenseToEhr,
  DEFAULT_FHIR_SERVERS,
} from '../src/services/fhirClient';

async function runTests() {
  console.log('Testing SMART on FHIR OAuth 2.0 PKCE auth:');

  // Test 1: PKCE verifier and challenge
  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);
  if (!verifier || verifier.length < 43 || !challenge) {
    throw new Error('Invalid PKCE parameters generated');
  }
  console.log(`  ✓ PKCE code_verifier and code_challenge generated (S256, ${verifier.length} chars)`);

  // Test 2: Token issuance and scopes
  const session = await authenticateWithSmartPkce('Patient/MRN-849201');
  if (!hasRequiredScope('patient/MedicationRequest.read') || !hasRequiredScope('patient/MedicationDispense.write')) {
    throw new Error('Session missing required scopes');
  }
  console.log(`  ✓ Session issued for ${session.user.fullName} (${session.grantedScopes.length} scopes)`);

  // Test 3: Authenticated requests
  const readResult = await queryEhrMedicationRequest('ORD-2026-9042', DEFAULT_FHIR_SERVERS[1]);
  if (readResult.httpStatus !== 200 || !readResult.success) {
    throw new Error('Authenticated read failed');
  }
  console.log(`  ✓ Authenticated GET /MedicationRequest -> HTTP 200 OK`);

  const dummyDispense = {
    resourceType: 'MedicationDispense',
    id: 'disp-auth-test-2026',
    status: 'in-progress',
    medicationCodeableConcept: { text: 'Insulin Glargine 100 UNT/ML' },
  };
  const writeResult = await submitMedicationDispenseToEhr(dummyDispense, DEFAULT_FHIR_SERVERS[1]);
  if (writeResult.httpStatus !== 201 || !writeResult.success) {
    throw new Error('Authenticated write failed');
  }
  console.log(`  ✓ Authenticated POST /MedicationDispense -> HTTP 201 Created`);

  // Test 4: Token revocation / 401 gate
  simulateTokenRevocation();
  const rejectedRead = await queryEhrMedicationRequest('ORD-2026-9042', DEFAULT_FHIR_SERVERS[1]);
  const rejectedWrite = await submitMedicationDispenseToEhr(dummyDispense, DEFAULT_FHIR_SERVERS[1]);
  if (rejectedRead.httpStatus !== 401 || rejectedWrite.httpStatus !== 401) {
    throw new Error('Unauthenticated requests were not rejected with 401');
  }
  console.log(`  ✓ Revoked token rejected with HTTP 401 on both read and write`);

  // Test 5: Token refresh
  const refreshed = await simulateTokenRefresh();
  const recoveredRead = await queryEhrMedicationRequest('ORD-2026-9042', DEFAULT_FHIR_SERVERS[1]);
  if (recoveredRead.httpStatus !== 200 || !recoveredRead.success) {
    throw new Error('Token refresh failed to restore access');
  }
  console.log(`  ✓ Token refresh succeeded, FHIR access restored`);

  console.log('All SMART on FHIR auth tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

