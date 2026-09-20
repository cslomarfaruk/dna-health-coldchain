import assert from 'assert';

const API_URL = 'http://localhost:3001/api';

async function testSurgeryIntegration() {
  console.log('====================================================');
  console.log(' INTEGRATION TEST: Case 2 Surgical Safety Checklist (OR Time-Out)');
  console.log('====================================================\n');

  // Test 1: Unauthenticated access rejection
  console.log('Test 1: Unauthenticated request to /api/surgery/cases...');
  const unauthRes = await fetch(`${API_URL}/surgery/cases`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return HTTP 401 Unauthorized');
  console.log('  ✓ Unauthenticated access safely blocked with HTTP 401');

  // Test 2: Authentication
  console.log('\nTest 2: Authenticating as Surgical Staff...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nurse_elizabeth', password: 'NursePass123!' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login should succeed with HTTP 200');
  const loginData = (await loginRes.json()) as any;
  const token = loginData.token;
  assert.ok(token, 'Auth token must be returned');
  console.log(`  ✓ Authenticated as ${loginData.user.fullName} (${loginData.user.role})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test 3: Retrieve all scheduled surgical cases
  console.log('\nTest 3: Fetching scheduled OR cases from /api/surgery/cases...');
  const casesRes = await fetch(`${API_URL}/surgery/cases`, { headers: authHeaders });
  assert.strictEqual(casesRes.status, 200, 'Fetching cases should return 200');
  const cases = (await casesRes.json()) as any[];
  assert.ok(Array.isArray(cases) && cases.length >= 4, 'Should return at least 4 surgical scenarios');
  console.log(`  ✓ Retrieved ${cases.length} scheduled surgical cases:`);
  cases.forEach((c) => {
    console.log(`    • [${c.caseId}] ${c.procedureName} - ${c.patientName} (${c.overallReadiness})`);
  });

  // Test 4: Detailed lookup of cleared case surg-case-001
  console.log('\nTest 4: Inspecting scheduled surgery details for surg-case-001...');
  const case1Res = await fetch(`${API_URL}/surgery/cases/surg-case-001`, { headers: authHeaders });
  assert.strictEqual(case1Res.status, 200);
  const case1 = (await case1Res.json()) as any;
  assert.strictEqual(case1.procedure.snomedCode, '52734007', 'SNOMED code for Total Hip Arthroplasty');
  assert.strictEqual(case1.procedure.laterality, 'RIGHT', 'Laterality check');
  assert.strictEqual(case1.consent.isSigned, true, 'Consent must be signed');
  assert.strictEqual(case1.consent.consentStatus, 'active', 'Consent status must be active');
  assert.strictEqual(case1.coagulation.tests.inr.loincCode, '6301-6', 'LOINC for INR');
  assert.strictEqual(case1.coagulation.tests.platelets.loincCode, '777-3', 'LOINC for Platelets');
  assert.strictEqual(case1.coagulation.overallStatus, 'SAFE', 'Coagulation must be safe');
  console.log('  ✓ Verified procedure SNOMED 52734007, Consent active, INR LOINC 6301-6, Platelets LOINC 777-3');

  // Test 5: Verify pre-incision time-out endpoint
  console.log('\nTest 5: POST /api/surgery/cases/surg-case-001/verify-timeout...');
  const verifyRes = await fetch(`${API_URL}/surgery/cases/surg-case-001/verify-timeout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = (await verifyRes.json()) as any;
  assert.strictEqual(verifyData.overallReadiness, 'CLEARED_FOR_INCISION');
  assert.strictEqual(verifyData.activeSafetyHolds.length, 0);
  console.log('  ✓ Pre-incision verification confirmed: CLEARED_FOR_INCISION with 0 safety holds');

  // Test 6: Enforce surgical hold on missing consent (surg-case-002-missing-consent)
  console.log('\nTest 6: Enforcing safety gate refusal on missing consent (surg-case-002)...');
  const holdConsentRes = await fetch(`${API_URL}/surgery/cases/surg-case-002-missing-consent/complete-timeout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(holdConsentRes.status, 400, 'Must block with HTTP 400 when hold is active');
  const holdConsentData = (await holdConsentRes.json()) as any;
  assert.strictEqual(holdConsentData.error, 'SURGICAL_HOLD_ACTIVE');
  assert.ok(
    holdConsentData.message.includes('CONSENT') || holdConsentData.activeSafetyHolds.some((h: string) => h.includes('CONSENT')),
    'Error message must state missing consent'
  );
  console.log('  ✓ Refusal confirmed: Time-out blocked due to unsigned consent');

  // Test 7: Enforce surgical hold on antibiotic allergy (surg-case-003-antibiotic-allergy)
  console.log('\nTest 7: Enforcing safety gate refusal on antibiotic allergy (surg-case-003)...');
  const holdAllergyRes = await fetch(`${API_URL}/surgery/cases/surg-case-003-antibiotic-allergy/complete-timeout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(holdAllergyRes.status, 400, 'Must block with HTTP 400 when hold is active');
  const holdAllergyData = (await holdAllergyRes.json()) as any;
  assert.strictEqual(holdAllergyData.error, 'SURGICAL_HOLD_ACTIVE');
  assert.ok(
    holdAllergyData.activeSafetyHolds.some((h: string) => h.toLowerCase().includes('allergy')),
    'Active hold must highlight antibiotic allergy'
  );
  console.log('  ✓ Refusal confirmed: Time-out blocked due to Cefazolin allergy contraindication');

  // Test 8: Enforce surgical hold on critical coagulopathy (surg-case-004-high-inr)
  console.log('\nTest 8: Enforcing safety gate refusal on high INR / low platelets (surg-case-004)...');
  const holdCoagRes = await fetch(`${API_URL}/surgery/cases/surg-case-004-high-inr/complete-timeout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(holdCoagRes.status, 400, 'Must block with HTTP 400 when hold is active');
  const holdCoagData = (await holdCoagRes.json()) as any;
  assert.strictEqual(holdCoagData.error, 'SURGICAL_HOLD_ACTIVE');
  assert.ok(
    holdCoagData.activeSafetyHolds.some((h: string) => h.toLowerCase().includes('coagul') || h.toLowerCase().includes('inr')),
    'Active hold must highlight coagulopathy'
  );
  console.log('  ✓ Refusal confirmed: Time-out blocked due to INR 2.8 and Platelets 42K bleeding risk');

  // Test 9: Complete Time-Out on cleared case (surg-case-001) & compile FHIR Composition
  console.log('\nTest 9: Completing Time-Out on cleared case surg-case-001 and submitting FHIR Composition...');
  const completeRes = await fetch(`${API_URL}/surgery/cases/surg-case-001/complete-timeout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(completeRes.status, 200);
  const completeData = (await completeRes.json()) as any;
  assert.strictEqual(completeData.success, true);
  assert.ok(completeData.compositionId, 'Composition ID must be returned');
  console.log(`  ✓ Time-Out Attestation completed. FHIR Composition ID: ${completeData.compositionId}`);
  console.log(`  ✓ HAPI FHIR Sync Status: ${completeData.fhirSyncStatus}`);

  // Test 10: Retrieve raw compiled HL7 FHIR R4 Composition
  console.log('\nTest 10: Retrieving raw HL7 FHIR R4 Composition document...');
  const compRes = await fetch(`${API_URL}/surgery/cases/surg-case-001/composition`, { headers: authHeaders });
  assert.strictEqual(compRes.status, 200);
  const comp = (await compRes.json()) as any;
  assert.strictEqual(comp.resourceType, 'Composition');
  assert.strictEqual(comp.status, 'final');
  assert.strictEqual(comp.type.coding[0].code, '11537-8', 'LOINC 11537-8 Surgical Note');
  assert.ok(Array.isArray(comp.section) && comp.section.length === 5, 'Must contain 5 clinical sections');
  console.log('  ✓ Retrieved authentic HL7 FHIR R4 Composition:');
  console.log(`    • Resource: ${comp.resourceType}/${comp.id}`);
  console.log(`    • Title: "${comp.title}"`);
  console.log(`    • LOINC Type: ${comp.type.coding[0].code} (${comp.type.coding[0].display})`);
  console.log(`    • Sections (${comp.section.length}): ${comp.section.map((s: any) => s.title).join(', ')}`);

  console.log('\n====================================================');
  console.log(' SURGICAL SAFETY CHECKLIST INTEGRATION TESTS: 100% PASS');
  console.log('====================================================\n');
}

testSurgeryIntegration().catch((err) => {
  console.error('\n✕ SURGERY INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
