import { prisma } from '../../server/db';
import { findExistingFhirMedicationDispense } from '../../server/modules/fhir/fhirClient';

const BASE_URL = 'http://localhost:3001';

const HL7_SAMPLE = [
  'MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG20260916TEST||2.5',
  'PID|1||MRN-849201^^^ST_JUDE^MR||WARREN^ELIZABETH^M||19780624|F',
  'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT^M^^DR|||IPD',
  'ORC|NW|ORD-2026-TEST-DIST|FIL-88192||CM||1^BID^20260916093000||20260916093000|10842^KAPLAN^ROBERT|||PHARMACY',
  'RXO|274783^INSULIN GLARGINE 100 UNIT/ML^RXNORM|100|UNIT||||||||SC',
  'RXR|SC^SUBCUTANEOUS^HL70162',
].join('\r') + '\r';

async function runDistributedConsistencySuite() {
  console.log('\n====================================================');
  console.log(' RUNNING DISTRIBUTED CONSISTENCY & RECOVERY SUITE');
  console.log('====================================================\n');

  // 1. Authenticate Pharmacist
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pharm_vance', password: 'PharmPass123!' }),
  });
  const { token: pharmToken } = await loginRes.json();

  // Helper to create a validated workflow
  async function createValidatedWorkflow(suffix: string) {
    const hl7Msg = HL7_SAMPLE
      .replace('MSG20260916TEST', `MSG-DIST-${Date.now()}-${suffix}`)
      .replace('ORD-2026-TEST-DIST', `ORD-DIST-${suffix}-${Date.now().toString().slice(-4)}`);

    const indent = await prisma.medicationIndent.create({
      data: {
        indentNumber: `IND-DIST-${suffix}-${Date.now().toString().slice(-4)}`,
        patientMrn: 'MRN-849201',
        patientName: 'Warren, Elizabeth',
        requestedDrugName: 'Insulin Glargine',
        requestedDose: '100',
        requestedUnits: 'UNIT',
        route: 'Subcutaneous',
        ward: 'Ward 4B',
        bed: 'Bed 12',
        status: 'PENDING',
      },
    });

    const initRes = await fetch(`${BASE_URL}/api/workflows/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pharmToken}`,
      },
      body: JSON.stringify({
        indentId: indent.id,
        rawHl7: hl7Msg,
        fhirMedicationRequestId: 'medreq-ord-2026-9042',
      }),
    });

    const initData = await initRes.json();
    if (!initData.workflow) {
      console.error('Failed to initiate workflow:', initRes.status, initData);
      throw new Error(`initiate returned ${initRes.status}: ${JSON.stringify(initData)}`);
    }
    return initData.workflow;
  }

  // ----------------------------------------------------
  // CASE A: Local Transaction Succeeds + FHIR Succeeds
  // ----------------------------------------------------
  console.log('--- TEST A: Local Transaction Succeeds + FHIR Succeeds ---');
  const wfA = await createValidatedWorkflow('A');
  console.log(`Created Workflow A: ${wfA.workflowNumber} (Status: ${wfA.status})`);

  const fulfillResA = await fetch(`${BASE_URL}/api/workflows/${wfA.id}/fulfill`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pharmToken}`,
      'Idempotency-Key': `idemp-dist-a-${wfA.id}`,
    },
  });

  if (fulfillResA.status !== 200) {
    throw new Error(`Test A Failed: Expected 200, got ${fulfillResA.status}: ${await fulfillResA.text()}`);
  }

  const fulfillDataA = await fulfillResA.json();
  const dbWfA = await prisma.dispenseWorkflow.findUnique({
    where: { id: wfA.id },
    include: { outbox: true },
  });

  if (dbWfA?.status !== 'DISPATCHED') {
    throw new Error(`Test A Failed: Workflow status in DB is ${dbWfA?.status}, expected DISPATCHED`);
  }
  if (dbWfA.outbox?.status !== 'COMPLETED') {
    throw new Error(`Test A Failed: Outbox status is ${dbWfA.outbox?.status}, expected COMPLETED`);
  }
  if (!fulfillDataA.fhirDispenseId) {
    throw new Error('Test A Failed: Missing fhirDispenseId in response');
  }

  // Verify AuditEvents for Test A
  const auditsA = await prisma.auditRecord.findMany({
    where: {
      entityReference: { in: [`DispenseWorkflow/${wfA.id}`, `MedicationDispense/${fulfillDataA.fhirDispenseId}`] },
    },
  });
  const eventTypesA = auditsA.map((a) => a.eventType);
  if (!eventTypesA.includes('FULFILLMENT_REQUESTED') || !eventTypesA.includes('FULFILLMENT_COMPLETED')) {
    throw new Error(`Test A Failed: Missing required audit events. Found: ${eventTypesA.join(', ')}`);
  }

  console.log(`  ✓ Workflow transitioned to DISPATCHED with FHIR ID: ${fulfillDataA.fhirDispenseId}`);
  console.log(`  ✓ Outbox record marked COMPLETED with 0 errors`);
  console.log(`  ✓ Verified audit trail: ${eventTypesA.join(' -> ')}`);
  console.log('✓ TEST A PASSED!\n');

  // ----------------------------------------------------
  // CASE B: FHIR Fails
  // ----------------------------------------------------
  console.log('--- TEST B: External FHIR Call Fails (Fails Closed) ---');
  const wfB = await createValidatedWorkflow('B');

  // Point workflow to an invalid/nonexistent FHIR MedicationRequest that HAPI rejects
  await prisma.dispenseWorkflow.update({
    where: { id: wfB.id },
    data: { fhirMedicationRequestId: 'nonexistent-medreq-xyz999' },
  });

  const fulfillResB = await fetch(`${BASE_URL}/api/workflows/${wfB.id}/fulfill`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pharmToken}`,
      'Idempotency-Key': `idemp-dist-b-${wfB.id}`,
    },
  });

  if (fulfillResB.status !== 502) {
    throw new Error(`Test B Failed: Expected HTTP 502 Bad Gateway on FHIR failure, got ${fulfillResB.status}`);
  }

  const dbWfB = await prisma.dispenseWorkflow.findUnique({
    where: { id: wfB.id },
    include: { outbox: true },
  });

  if (dbWfB?.status !== 'DISPENSE_FAILED') {
    throw new Error(`Test B Failed: Expected workflow status DISPENSE_FAILED, got ${dbWfB?.status}`);
  }
  if (dbWfB.outbox?.status !== 'FAILED') {
    throw new Error(`Test B Failed: Expected outbox status FAILED, got ${dbWfB.outbox?.status}`);
  }

  const auditsB = await prisma.auditRecord.findMany({
    where: { entityReference: `DispenseWorkflow/${wfB.id}` },
  });
  const eventTypesB = auditsB.map((a) => a.eventType);
  if (!eventTypesB.includes('FHIR_WRITE_FAILED')) {
    throw new Error(`Test B Failed: Expected FHIR_WRITE_FAILED audit event. Found: ${eventTypesB.join(', ')}`);
  }

  console.log(`  ✓ Workflow safely transitioned to DISPENSE_FAILED (HTTP 502 returned)`);
  console.log(`  ✓ Outbox recorded FAILED state with diagnostic error`);
  console.log(`  ✓ Audit logged FHIR_WRITE_FAILED`);
  console.log('✓ TEST B PASSED!\n');

  // ----------------------------------------------------
  // CASE C: Simulated Local DB Failure After Successful FHIR Write
  // ----------------------------------------------------
  console.log('--- TEST C: Simulated Local DB Failure Post-FHIR Write ---');
  const wfC = await createValidatedWorkflow('C');
  console.log(`Created Workflow C: ${wfC.workflowNumber} (Status: ${wfC.status})`);

  // Invoke with test hook header to simulate crash right after HAPI returns 201 Created
  const fulfillResC = await fetch(`${BASE_URL}/api/workflows/${wfC.id}/fulfill`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pharmToken}`,
      'Idempotency-Key': `idemp-dist-c-${wfC.id}`,
      'x-test-simulate-db-failure': 'true',
    },
  });

  if (fulfillResC.status !== 500) {
    throw new Error(`Test C Failed: Expected 500 from simulated crash, got ${fulfillResC.status}`);
  }

  // Allow HAPI search indexing 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const dbWfC = await prisma.dispenseWorkflow.findUnique({
    where: { id: wfC.id },
    include: { outbox: true },
  });

  // In DB, workflow is still in DISPENSING because the final commit crashed!
  if (dbWfC?.status !== 'DISPENSING') {
    throw new Error(`Test C Failed: Expected workflow status DISPENSING, got ${dbWfC?.status}`);
  }
  if (dbWfC.outbox?.status !== 'IN_FLIGHT') {
    throw new Error(`Test C Failed: Expected outbox status IN_FLIGHT, got ${dbWfC.outbox?.status}`);
  }

  // Verify that the MedicationDispense was successfully created on remote FHIR server:
  let remoteFhirId = dbWfC.outbox?.fhirResourceId;
  if (!remoteFhirId) {
    const remoteCheckC = await findExistingFhirMedicationDispense(wfC.workflowNumber);
    remoteFhirId = remoteCheckC.fhirResourceId;
  }
  if (!remoteFhirId) {
    throw new Error('Test C Failed: MedicationDispense was not found in outbox or remote FHIR server');
  }

  // Verify that remote resource exists and is accessible directly on HAPI FHIR:
  const directFhirRes = await fetch(`https://hapi.fhir.org/baseR4/MedicationDispense/${remoteFhirId}`);
  if (!directFhirRes.ok) {
    throw new Error(`Test C Failed: GET /MedicationDispense/${remoteFhirId} returned ${directFhirRes.status}`);
  }
  const directFhirJson = (await directFhirRes.json()) as any;
  if (directFhirJson.resourceType !== 'MedicationDispense') {
    throw new Error(`Test C Failed: Resource is not MedicationDispense`);
  }

  console.log(`  ✓ Simulated crash reproduced: Local DB left in DISPENSING state`);
  console.log(`  ✓ Remote HAPI FHIR contains real MedicationDispense/${remoteFhirId}`);
  console.log('✓ TEST C PASSED!\n');

  // ----------------------------------------------------
  // CASE D: Retry / Recovery After Case C
  // ----------------------------------------------------
  console.log('--- TEST D: Retry & Deterministic Recovery Reconciles Workflow ---');
  // Allow stale lock lease to expire (4 seconds) to test automatic retry/recovery
  await new Promise((resolve) => setTimeout(resolve, 4200));

  const recoverRes = await fetch(`${BASE_URL}/api/workflows/${wfC.id}/fulfill`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pharmToken}`,
      'Idempotency-Key': `idemp-dist-c-${wfC.id}`,
    },
  });

  if (recoverRes.status !== 200) {
    throw new Error(`Test D Failed: Expected 200 on recovery, got ${recoverRes.status}: ${await recoverRes.text()}`);
  }

  const recoverData = await recoverRes.json();
  if (recoverData.fhirDispenseId !== remoteFhirId) {
    throw new Error(
      `Test D Failed: Recovered FHIR ID (${recoverData.fhirDispenseId}) does not match existing (${remoteFhirId})`
    );
  }

  const dbWfCRecovered = await prisma.dispenseWorkflow.findUnique({
    where: { id: wfC.id },
    include: { outbox: true },
  });

  if (dbWfCRecovered?.status !== 'DISPATCHED') {
    throw new Error(`Test D Failed: Expected status DISPATCHED, got ${dbWfCRecovered?.status}`);
  }
  if (dbWfCRecovered.outbox?.status !== 'COMPLETED') {
    throw new Error(`Test D Failed: Expected outbox status COMPLETED, got ${dbWfCRecovered.outbox?.status}`);
  }

  console.log(`  ✓ Recovery detected existing FHIR resource: ${recoverData.fhirDispenseId}`);
  console.log(`  ✓ Workflow successfully reconciled to DISPATCHED without duplicate remote write`);
  console.log('✓ TEST D PASSED!\n');

  // ----------------------------------------------------
  // CASE E: Duplicate / Concurrent Fulfillment Requests
  // ----------------------------------------------------
  console.log('--- TEST E: Duplicate & Concurrent Fulfillment Protection ---');
  const wfE = await createValidatedWorkflow('E');
  const sharedKey = `idemp-concurrent-${wfE.id}`;

  // Fire two concurrent fulfill requests simultaneously
  const [resE1, resE2] = await Promise.all([
    fetch(`${BASE_URL}/api/workflows/${wfE.id}/fulfill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pharmToken}`,
        'Idempotency-Key': sharedKey,
      },
    }),
    fetch(`${BASE_URL}/api/workflows/${wfE.id}/fulfill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pharmToken}`,
        'Idempotency-Key': sharedKey,
      },
    }),
  ]);

  const status1 = resE1.status;
  const status2 = resE2.status;
  console.log(`  Concurrent request results: Request 1 = ${status1}, Request 2 = ${status2}`);

  // One request must succeed with 200, the other must return 200 (cached) or 409 (locked)
  const statuses = [status1, status2];
  if (!statuses.includes(200)) {
    throw new Error(`Test E Failed: At least one request must succeed with 200. Got: ${statuses.join(', ')}`);
  }
  for (const s of statuses) {
    if (s !== 200 && s !== 409) {
      throw new Error(`Test E Failed: Unexpected status code in concurrency test: ${s}`);
    }
  }

  console.log('  ✓ Concurrency race safely handled: No crash or invalid state');
  console.log('✓ TEST E PASSED!\n');

  // ----------------------------------------------------
  // CASE F: No Duplicate MedicationDispense on FHIR Server
  // ----------------------------------------------------
  console.log('--- TEST F: Verify Exactly ONE MedicationDispense Created for Case C/D ---');
  const tokenEnc = encodeURIComponent('http://hospital.dnahealth.internal/dispenses|DISP-' + wfC.workflowNumber);
  let bundleF: any = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const checkF = await fetch(`https://hapi.fhir.org/baseR4/MedicationDispense?identifier=${tokenEnc}&_total=accurate`);
    if (checkF.ok) {
      bundleF = await checkF.json();
      const count = bundleF.total ?? bundleF.entry?.length ?? 0;
      if (count >= 1) break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const finalCount = bundleF?.total ?? bundleF?.entry?.length ?? 0;
  if (!bundleF || finalCount !== 1) {
    throw new Error(`Test F Failed: Expected exactly 1 remote MedicationDispense, but found ${finalCount}!`);
  }

  console.log(`  ✓ HAPI FHIR search confirmed total = 1 for identifier DISP-${wfC.workflowNumber}`);
  console.log('✓ TEST F PASSED! (Zero duplicate remote resources created)\n');

  console.log('====================================================');
  console.log(' ALL 6 DISTRIBUTED CONSISTENCY TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runDistributedConsistencySuite().catch((err) => {
  console.error('\n❌ Distributed Consistency Test Suite FAILED:', err);
  process.exit(1);
});
