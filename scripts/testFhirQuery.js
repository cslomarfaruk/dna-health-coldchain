// Tests for querying EHR FHIR MedicationRequest orders.
import { queryEhrMedicationRequest, DEFAULT_FHIR_SERVERS } from '../src/services/fhirClient.js';

async function runTests() {
  console.log('Testing FHIR MedicationRequest queries:');

  const testOrders = [
    { id: 'ORD-2026-9042', expectedDrug: 'insulin glargine', expectedRxCui: '274783' },
    { id: 'ORD-2026-9043', expectedDrug: 'trastuzumab', expectedRxCui: '228833' },
    { id: 'ORD-2026-9044', expectedDrug: 'filgrastim', expectedRxCui: '214557' }
  ];

  for (const order of testOrders) {
    const result = await queryEhrMedicationRequest(order.id, DEFAULT_FHIR_SERVERS[1]);

    if (!result.success || !result.data) {
      console.error(`  ✕ Failed to fetch ${order.id}`);
      process.exit(1);
    }

    const coding = result.data.medicationCodeableConcept.coding[0];
    if (coding.code !== order.expectedRxCui) {
      console.error(`  ✕ RxCUI mismatch for ${order.id}: expected ${order.expectedRxCui}, got ${coding.code}`);
      process.exit(1);
    }

    console.log(`  ✓ ${order.id} -> ${coding.display} (RxCUI: ${coding.code}) [${result.latencyMs}ms]`);
  }

  console.log('All FHIR query tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

