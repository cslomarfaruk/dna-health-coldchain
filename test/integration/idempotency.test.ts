import { prisma } from '../../server/db';

const API_URL = 'http://localhost:3001/api';

async function testIdempotency() {
  console.log('--- INTEGRATION TEST: Dispense Fulfillment Idempotency ---');

  // Authenticate as Pharmacist
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pharm_vance', password: 'PharmPass123!' }),
  });
  const { token } = (await loginRes.json()) as any;

  const indent = await prisma.medicationIndent.findUnique({
    where: { indentNumber: 'IND-2026-9042' },
  });

  // Create a validated workflow to fulfill
  const testWf = await prisma.dispenseWorkflow.create({
    data: {
      workflowNumber: `WF-IDEMP-${Date.now()}`,
      status: 'VALIDATED',
      indentId: indent?.id,
      fhirMedicationRequestId: 'medreq-ord-2026-9042',
      coolerBoxId: 'COOLER-IDEMP-01',
      currentTempCelsius: 3.4,
    },
  });

  const idempotencyKey = `idemp-key-test-${testWf.id}`;

  // Request #1: First Fulfillment
  console.log(`Request #1: Executing fulfillment with Idempotency-Key: ${idempotencyKey}...`);
  const res1 = await fetch(`${API_URL}/workflows/${testWf.id}/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
  });

  if (!res1.ok) {
    const errText = await res1.text();
    throw new Error(`Request #1 failed (${res1.status}): ${errText}`);
  }

  const data1 = (await res1.json()) as any;
  const initialDispenseId = data1.fhirDispenseId;
  console.log(`  ✓ Request #1 succeeded: Created FHIR Dispense ID: ${initialDispenseId}`);

  // Request #2: Repeated Fulfillment with SAME Idempotency-Key
  console.log(`Request #2: Replaying EXACT same request with same Idempotency-Key...`);
  const res2 = await fetch(`${API_URL}/workflows/${testWf.id}/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
  });

  if (!res2.ok) {
    throw new Error(`Request #2 failed: ${res2.status}`);
  }

  const data2 = (await res2.json()) as any;
  console.log(`  ✓ Request #2 succeeded: Returned FHIR Dispense ID: ${data2.fhirDispenseId}`);

  if (data1.fhirDispenseId !== data2.fhirDispenseId) {
    throw new Error(`IDEMPOTENCY VIOLATION: Request #2 generated a different dispense ID: ${data2.fhirDispenseId} vs ${data1.fhirDispenseId}`);
  }

  console.log('  ✓ Proved idempotency: exactly same cached response returned without duplicate dispensing');
  console.log('✓ Idempotency integration tests passed!\n');
}

testIdempotency().catch((err) => {
  console.error('✕ Idempotency test failed:', err.message);
  process.exit(1);
});
