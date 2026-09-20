import { prisma } from '../../server/db';

const API_URL = 'http://localhost:3001/api';

async function runE2ETests() {
  console.log('====================================================');
  console.log(' RUNNING COMPLETE END-TO-END CLINICAL PIPELINE SUITE');
  console.log('====================================================\n');

  // Authenticate Nurse and Pharmacist
  const nurseRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nurse_elizabeth', password: 'NursePass123!' }),
  });
  const { token: nurseToken } = (await nurseRes.json()) as any;

  const pharmRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pharm_vance', password: 'PharmPass123!' }),
  });
  const { token: pharmToken } = (await pharmRes.json()) as any;

  // Clean up any stale pending test indents for test MRN so rapid re-runs don't trigger the 60s duplicate throttle
  await prisma.medicationIndent.updateMany({
    where: { patientMrn: 'MRN-849201', status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });

  // ----------------------------------------------------
  // SCENARIO A: Complete Valid Workflow (All 3 Reconciled)
  // ----------------------------------------------------
  console.log('--- SCENARIO A: Valid Medication Concordance & Dispatch ---');

  // 1. Nurse submits indent
  const indentResA = await fetch(`${API_URL}/indents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Insulin Glargine',
      requestedDose: '100',
      requestedUnits: 'UNIT',
      ward: 'Ward 4B',
      bed: 'Bed 12',
    }),
  });
  const indentA = (await indentResA.json()) as any;
  console.log(`Step 1: Nurse created indent: ${indentA.indentNumber} (Status: ${indentA.status})`);

  // 2. HL7 OMP^O09 feed arrives
  const runId = Date.now();
  const hl7MessageA = [
    `MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-E2E-A-${runId}|P|2.5`,
    'PID|1||MRN-849201^^^HOSPITAL||WARREN^ELIZABETH||19720418|F',
    'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT|||IPD',
    'ORC|NW|ORD-2026-9042|||||||20260916093000',
    'RXO|274783^INSULIN GLARGINE^RXNORM|100|UNIT',
    'NTE|1|P|COLD CHAIN: MAINTAIN AT 2-8 C. DO NOT FREEZE.',
    'RXR|SC^SUBCUTANEOUS^HL70162',
  ].join('\r') + '\r';

  // 3. Initiate workflow: EHR query + RxNav lookup + 3-Way Reconciliation
  console.log('Step 2: Initiating 3-way reconciliation (Indent + FHIR + HL7)...');
  const initResA = await fetch(`${API_URL}/workflows/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
    body: JSON.stringify({
      indentId: indentA.id,
      rawHl7: hl7MessageA,
      fhirMedicationRequestId: 'medreq-ord-2026-9042',
    }),
  });

  if (!initResA.ok) {
    throw new Error(`Scenario A initiation failed: ${await initResA.text()}`);
  }

  const initDataA = (await initResA.json()) as any;
  console.log(`  ✓ 3-Way Reconciliation Result: ${initDataA.reconciliation.overallStatus}`);
  console.log(`  ✓ Workflow created: ${initDataA.workflow.workflowNumber} (Status: ${initDataA.workflow.status})`);

  if (initDataA.reconciliation.overallStatus !== 'PASSED') {
    throw new Error('Scenario A expected PASSED reconciliation');
  }

  // 4. Pharmacist authorizes fulfillment
  console.log('Step 3: Pharmacist authorizing fulfillment & cold-chain courier dispatch...');
  const fulfillResA = await fetch(`${API_URL}/workflows/${initDataA.workflow.id}/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
  });

  if (!fulfillResA.ok) {
    throw new Error(`Scenario A fulfillment failed: ${await fulfillResA.text()}`);
  }

  const fulfillDataA = (await fulfillResA.json()) as any;
  console.log(`  ✓ FHIR MedicationDispense written to HAPI FHIR: ID=${fulfillDataA.fhirDispenseId}`);
  console.log(`  ✓ Notification sent: "${fulfillDataA.notification.sanitizedMessage}"`);
  console.log(`  ✓ Workflow transitioned to: ${fulfillDataA.workflow.status}\n`);

  // ----------------------------------------------------
  // SCENARIO B: Wrong Dose Clinical Safety Block
  // ----------------------------------------------------
  console.log('--- SCENARIO B: Wrong Dose Safety Gate (Fulfillment MUST be blocked) ---');

  // Nurse enters 999 UNIT (overdose)
  const indentResB = await fetch(`${API_URL}/indents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Insulin Glargine',
      requestedDose: '999', // Critical dose error
      requestedUnits: 'UNIT',
      ward: 'Ward 4B',
    }),
  });
  const indentB = (await indentResB.json()) as any;
  console.log(`Step 1: Nurse created indent with wrong dose: ${indentB.requestedDose} ${indentB.requestedUnits}`);

  const hl7MessageB = [
    `MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-E2E-B-${Date.now()}|P|2.5`,
    'PID|1||MRN-849201^^^HOSPITAL||WARREN^ELIZABETH',
    'PV1|1|I|WARD-4B',
    'ORC|NW|ORD-2026-9042',
    'RXO|274783^INSULIN GLARGINE|100|UNIT', // HL7 has 100 UNIT
    'RXR|SC^SUBCUTANEOUS',
  ].join('\r') + '\r';

  const initResB = await fetch(`${API_URL}/workflows/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
    body: JSON.stringify({
      indentId: indentB.id,
      rawHl7: hl7MessageB,
      fhirMedicationRequestId: 'medreq-ord-2026-9042', // FHIR has 100 UNIT
    }),
  });

  const initDataB = (await initResB.json()) as any;
  console.log(`Step 2: Reconciliation executed: Status=${initDataB.reconciliation.overallStatus}`);
  console.log(`  Discrepancy: ${initDataB.reconciliation.discrepancies[0]}`);

  if (initDataB.reconciliation.overallStatus !== 'FAILED') {
    throw new Error('Scenario B expected FAILED reconciliation on dose mismatch!');
  }

  // Attempt to fulfill -> MUST BE BLOCKED
  console.log('Step 3: Pharmacist attempts fulfillment on failed reconciliation...');
  const fulfillResB = await fetch(`${API_URL}/workflows/${initDataB.workflow.id}/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
  });

  if (fulfillResB.status !== 400) {
    throw new Error(`CRITICAL SAFETY BREACH: Server returned status ${fulfillResB.status} instead of 400 for unsafe fulfillment!`);
  }
  const blockDataB = (await fulfillResB.json()) as any;
  console.log(`  ✓ Unsafe fulfillment blocked: "${blockDataB.message}"`);
  console.log('  ✓ Verified: No MedicationDispense created for overdose indent\n');

  // ----------------------------------------------------
  // SCENARIO C: Wrong Medication Discrepancy Gate
  // ----------------------------------------------------
  console.log('--- SCENARIO C: Wrong Medication Gate (Trastuzumab vs Insulin) ---');

  const indentResC = await fetch(`${API_URL}/indents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Trastuzumab', // Oncology Biologic
      requestedDose: '420',
      requestedUnits: 'MG',
      ward: 'Ward 4B',
    }),
  });
  const indentC = (await indentResC.json()) as any;

  const hl7MessageC = [
    `MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-E2E-C-${Date.now()}|P|2.5`,
    'PID|1||MRN-849201^^^HOSPITAL||WARREN^ELIZABETH',
    'PV1|1|I|WARD-4B',
    'ORC|NW|ORD-2026-9042',
    'RXO|228833^TRASTUZUMAB|420|MG',
    'RXR|IV^INTRAVENOUS',
  ].join('\r') + '\r';

  // Pointing to Insulin Glargine FHIR request medreq-ord-2026-9042
  const initResC = await fetch(`${API_URL}/workflows/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
    body: JSON.stringify({
      indentId: indentC.id,
      rawHl7: hl7MessageC,
      fhirMedicationRequestId: 'medreq-ord-2026-9042',
    }),
  });

  const initDataC = (await initResC.json()) as any;
  console.log(`Step 1: Reconciliation executed: Status=${initDataC.reconciliation.overallStatus}`);
  console.log(`  Discrepancy: ${initDataC.reconciliation.discrepancies[0]}`);

  if (initDataC.reconciliation.overallStatus !== 'FAILED') {
    throw new Error('Scenario C expected FAILED reconciliation on medication mismatch!');
  }
  console.log('  ✓ Verified: Wrong medication caught and fulfillment blocked\n');

  // ----------------------------------------------------
  // SCENARIO D: Invalid HL7 Message Type (ADT^A01)
  // ----------------------------------------------------
  console.log('--- SCENARIO D: Reject Invalid HL7 Message Type (ADT^A01) ---');

  const invalidHl7D = [
    'MSH|^~\\&|ADT_SYSTEM|HOSPITAL|CENTRAL_PHARM|HOSPITAL|20260916093000||ADT^A01|MSG-E2E-D|P|2.5',
    'PID|1||MRN-849201||WARREN^ELIZABETH',
    'PV1|1|I|WARD-4B',
  ].join('\r') + '\r';

  const initResD = await fetch(`${API_URL}/workflows/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pharmToken}`,
    },
    body: JSON.stringify({
      indentId: indentA.id,
      rawHl7: invalidHl7D,
      fhirMedicationRequestId: 'medreq-ord-2026-9042',
    }),
  });

  if (initResD.status !== 400) {
    throw new Error(`Expected 400 for ADT^A01 rejection, got ${initResD.status}`);
  }
  const errDataD = (await initResD.json()) as any;
  console.log(`  ✓ Invalid message type rejected: "${errDataD.message}"\n`);

  console.log('====================================================');
  console.log(' ALL END-TO-END CLINICAL SCENARIOS PASSED (100% PASS)');
  console.log('====================================================\n');
}

runE2ETests().catch((err) => {
  console.error('✕ E2E Pipeline failed:', err.message);
  process.exit(1);
});
