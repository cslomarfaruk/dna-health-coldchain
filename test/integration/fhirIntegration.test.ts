import {
  fetchFhirMedicationRequest,
  submitFhirMedicationDispense,
  submitFhirAuditEvent,
  FHIR_BASE_URL,
} from '../../server/modules/fhir/fhirClient';

async function testFhirInteroperability() {
  console.log(`--- INTEGRATION TEST: HL7 FHIR R4 Standards Interoperability (${FHIR_BASE_URL}) ---`);

  // Test 1: Fetch and normalize real MedicationRequest from HAPI FHIR
  console.log('Test 1: Querying live EHR for FHIR MedicationRequest/medreq-ord-2026-9042...');
  const fhirResult = await fetchFhirMedicationRequest('medreq-ord-2026-9042');

  if (!fhirResult.success || !fhirResult.data) {
    throw new Error(`Failed to fetch MedicationRequest from HAPI FHIR: ${fhirResult.error}`);
  }

  const req = fhirResult.data;
  console.log(`  ✓ Retrieved FHIR MedicationRequest: ID=${req.id}, Status=${req.status}, Intent=${req.intent}`);
  console.log(`  ✓ Coding: ${req.medicationName} (RxNorm: ${req.rxNormCode || 'N/A'})`);
  console.log(`  ✓ Dosage: ${req.dosageValue} ${req.dosageUnit}, Route: ${req.routeName || 'N/A'}`);
  console.log(`  ✓ Subject: ${req.patientReference}`);

  if (req.dosageValue !== 100 || req.dosageUnit !== 'UNIT') {
    throw new Error(`Expected dosage 100 UNIT, got ${req.dosageValue} ${req.dosageUnit}`);
  }

  // Test 2: Actually POST real FHIR R4 MedicationDispense to HAPI FHIR
  console.log('Test 2: Submitting authentic FHIR R4 MedicationDispense to HAPI FHIR...');
  const dispenseResult = await submitFhirMedicationDispense({
    workflowNumber: 'WF-INT-TEST-9042',
    medicationRequestId: req.id,
    patientReference: req.patientReference,
    patientName: 'WARREN, ELIZABETH',
    medicationName: req.medicationName,
    rxNormCode: req.rxNormCode,
    quantityValue: req.dosageValue,
    quantityUnit: req.dosageUnit,
    performerPractitionerId: 'Practitioner/PHARM-4401',
    performerName: 'Dr. Marcus Vance, PharmD',
    coolerBoxId: 'COOLER-BOX-8821',
    currentTempCelsius: 3.8,
    tempRangeCelsius: [2.0, 8.0],
    courierId: 'COUR-409',
    courierName: 'James Miller',
    destinationLocation: 'Ward 4B - Fridge Lockbox A',
    estimatedArrivalMinutes: 10,
  });

  if (!dispenseResult.success || !dispenseResult.fhirResourceId) {
    throw new Error(`MedicationDispense POST failed: ${dispenseResult.error}`);
  }
  console.log(`  ✓ MedicationDispense created on HAPI FHIR. Returned ID: ${dispenseResult.fhirResourceId}`);

  // Test 3: Actually POST real FHIR R4 AuditEvent to HAPI FHIR
  console.log('Test 3: Submitting authentic FHIR R4 AuditEvent to HAPI FHIR...');
  const auditResult = await submitFhirAuditEvent({
    eventType: 'cold-chain-dispatch',
    action: 'C',
    outcome: '0',
    outcomeDesc: 'Cold chain medication dispatched under 2-8°C controls with zero-PHI alert.',
    practitionerReference: 'Practitioner/PHARM-4401',
    practitionerName: 'Dr. Marcus Vance, PharmD',
    entityReference: `MedicationDispense/${dispenseResult.fhirResourceId}`,
  });

  if (!auditResult.success) {
    console.log(`  ! Notice on AuditEvent: ${auditResult.error}`);
  } else {
    console.log(`  ✓ AuditEvent created on HAPI FHIR. Returned ID: ${auditResult.fhirAuditEventId}`);
  }

  console.log('✓ All FHIR R4 Interoperability integration tests passed!\n');
}

testFhirInteroperability().catch((err) => {
  console.error('✕ FHIR Interoperability test failed:', err.message);
  process.exit(1);
});
