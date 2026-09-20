const API_URL = 'http://localhost:3001/api';

async function testAuthAndRbac() {
  console.log('--- INTEGRATION TEST: Authentication & Server-Side RBAC ---');

  // Test 1: Unauthenticated request should return 401
  console.log('Test 1: Unauthenticated access to protected clinical endpoint...');
  const unauthRes = await fetch(`${API_URL}/indents`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected HTTP 401 Unauthorized, but got ${unauthRes.status}`);
  }
  console.log('  ✓ Unauthenticated access rejected with HTTP 401 Unauthorized');

  // Test 2: Nurse login & Indent creation
  console.log('Test 2: Nurse authentication & Indent submission...');
  const nurseLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nurse_elizabeth', password: 'NursePass123!' }),
  });
  if (!nurseLoginRes.ok) {
    throw new Error(`Nurse login failed: ${nurseLoginRes.status}`);
  }
  const nurseData = (await nurseLoginRes.json()) as any;
  const nurseToken = nurseData.token;
  console.log(`  ✓ Nurse authenticated successfully: ${nurseData.user.fullName} (${nurseData.user.role})`);

  const createIndentRes = await fetch(`${API_URL}/indents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      patientMrn: 'MRN-AUTH-RBAC',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Insulin Glargine',
      requestedDose: '100',
      requestedUnits: 'UNIT',
      ward: 'Ward 4B',
      bed: 'Bed 12',
    }),
  });
  if (createIndentRes.status !== 201) {
    throw new Error(`Nurse indent creation failed: ${createIndentRes.status}`);
  }
  const newIndent = (await createIndentRes.json()) as any;
  console.log(`  ✓ Nurse permitted to create indent: ${newIndent.indentNumber}`);

  // Test 3: Auditor login
  console.log('Test 3: Auditor authentication...');
  const auditLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'auditor_chen', password: 'AuditPass123!' }),
  });
  const auditData = (await auditLoginRes.json()) as any;
  const auditorToken = auditData.token;
  console.log(`  ✓ Auditor authenticated: ${auditData.user.fullName} (${auditData.user.role})`);

  // Test 4: Pharmacist login
  console.log('Test 4: Pharmacist authentication...');
  const pharmLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pharm_vance', password: 'PharmPass123!' }),
  });
  const pharmData = (await pharmLoginRes.json()) as any;
  const pharmToken = pharmData.token;
  console.log(`  ✓ Pharmacist authenticated: ${pharmData.user.fullName} (${pharmData.user.role})`);

  // Test 5: Server-side RBAC Guard: Nurse attempting dispense fulfillment MUST get 403
  console.log('Test 5: Nurse attempting dispense fulfillment (MUST FAIL with 403)...');
  const nurseFulfillRes = await fetch(`${API_URL}/workflows/dummy-wf-id/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurseToken}`,
    },
  });
  if (nurseFulfillRes.status !== 403) {
    throw new Error(`CRITICAL RBAC FAILURE: Nurse received status ${nurseFulfillRes.status} instead of 403 Forbidden!`);
  }
  console.log('  ✓ Nurse fulfillment attempt blocked with HTTP 403 Forbidden');

  // Test 6: Server-side RBAC Guard: Auditor attempting dispense fulfillment MUST get 403
  console.log('Test 6: Auditor attempting dispense fulfillment (MUST FAIL with 403)...');
  const auditFulfillRes = await fetch(`${API_URL}/workflows/dummy-wf-id/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auditorToken}`,
    },
  });
  if (auditFulfillRes.status !== 403) {
    throw new Error(`CRITICAL RBAC FAILURE: Auditor received status ${auditFulfillRes.status} instead of 403 Forbidden!`);
  }
  console.log('  ✓ Auditor fulfillment attempt blocked with HTTP 403 Forbidden');

  // Test 7: Auditor permitted to read audit trails
  console.log('Test 7: Auditor permitted to query audit logs...');
  const auditTrailRes = await fetch(`${API_URL}/audit`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  if (auditTrailRes.status !== 200) {
    throw new Error(`Auditor query failed with status ${auditTrailRes.status}`);
  }
  const auditLogs = (await auditTrailRes.json()) as any[];
  console.log(`  ✓ Auditor retrieved audit log records (${auditLogs.length} events recorded)`);

  console.log('✓ All Authentication and RBAC integration tests passed!\n');
}

testAuthAndRbac().catch((err) => {
  console.error('✕ Auth/RBAC test failed:', err.message);
  process.exit(1);
});
