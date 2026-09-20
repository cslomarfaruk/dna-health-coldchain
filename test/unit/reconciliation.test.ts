import { evaluateThreeWayReconciliation } from '../../server/modules/reconciliation/reconciliationService';
import { NormalizedFhirMedicationRequest } from '../../server/modules/fhir/fhirClient';
import { ParsedHl7Omp09 } from '../../server/modules/hl7/hl7Service';
import { ValidatedDrugInfo } from '../../server/modules/rxnorm/rxnormService';

function testReconciliation() {
  console.log('--- UNIT TEST: 3-Way Medication Reconciliation Engine ---');

  const baseIndent = {
    patientMrn: 'MRN-849201',
    requestedDrugName: 'Insulin Glargine',
    requestedDose: '100',
    requestedUnits: 'UNIT',
    formulation: '100 UNT/ML Injectable Solution',
    route: 'Subcutaneous',
  };

  const baseFhir: NormalizedFhirMedicationRequest = {
    id: 'medreq-ord-2026-9042',
    status: 'active',
    intent: 'order',
    priority: 'routine',
    patientReference: 'Patient/MRN-849201',
    medicationName: 'insulin glargine 100 UNT/ML Injectable Solution',
    rxNormCode: '274783',
    dosageValue: 100,
    dosageUnit: 'UNIT',
    routeName: 'Subcutaneous',
    authoredOn: '2026-09-16T09:30:00Z',
  };

  const baseHl7: ParsedHl7Omp09 = {
    rawMessage: '',
    msh: {
      sendingApp: 'EPIC_EHR',
      timestamp: '2026-09-16T09:30:00Z',
      messageType: 'OMP^O09',
      messageCode: 'OMP',
      triggerEvent: 'O09',
      controlId: 'MSG-9042',
      version: '2.5',
    },
    pid: {
      patientId: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
    },
    pv1: {
      patientClass: 'I',
      assignedLocation: 'WARD-4B-BED-12',
    },
    orc: {
      orderControl: 'NW',
      placerOrderNumber: 'ORD-2026-9042',
    },
    rxo: {
      drugCode: '274783',
      drugName: 'INSULIN GLARGINE',
      giveAmount: '100',
      giveUnits: 'UNIT',
    },
    rxr: {
      routeCode: 'SC',
      routeName: 'Subcutaneous',
    },
    notes: [],
    segmentsDetected: ['MSH', 'PID', 'PV1', 'ORC', 'RXO', 'RXR'],
  };

  const baseRxnorm: ValidatedDrugInfo = {
    queryName: 'Insulin Glargine',
    rxcui: '274783',
    officialName: 'insulin glargine',
    isRefrigeratedColdChain: true,
    activeIngredients: ['insulin glargine'],
    availableForms: ['insulin glargine 100 UNT/ML Injectable Solution'],
    validationStatus: 'MATCHED_OFFICIAL',
    formulationMatch: {
      status: 'EXACT_MATCH',
      prescribedStrength: '100 UNT/ML',
      clinicalSafetyNotes: 'Exact registered formulation match.',
    },
    fetchedAt: new Date().toISOString(),
  };

  // Test 1: Full Concordance (All 3 match) -> PASSED
  console.log('Test 1: Full concordance across Indent, FHIR, and HL7...');
  const res1 = evaluateThreeWayReconciliation(baseIndent, baseFhir, baseHl7, baseRxnorm);
  if (res1.overallStatus !== 'PASSED') {
    throw new Error(`Expected PASSED, got ${res1.overallStatus}: ${res1.discrepancies.join(', ')}`);
  }
  console.log('  ✓ Concordance PASSED: all deterministic clinical attributes verified');

  // Test 2: Wrong Dose (Indent 999 UNIT vs FHIR 100 UNIT) -> FAILED
  console.log('Test 2: Wrong Dose failure (Indent 999 UNIT vs 100 UNIT)...');
  const indentWrongDose = { ...baseIndent, requestedDose: '999' };
  const res2 = evaluateThreeWayReconciliation(indentWrongDose, baseFhir, baseHl7, baseRxnorm);
  if (res2.overallStatus !== 'FAILED' || res2.doseMatch !== false) {
    throw new Error(`Expected FAILED on dose mismatch, got ${res2.overallStatus}`);
  }
  console.log(`  ✓ Dose mismatch safely caught: ${res2.discrepancies[0]}`);

  // Test 3: Wrong Medication (Indent Trastuzumab vs FHIR Insulin) -> FAILED
  console.log('Test 3: Wrong Medication failure (Trastuzumab vs Insulin Glargine)...');
  const indentWrongDrug = { ...baseIndent, requestedDrugName: 'Trastuzumab' };
  const res3 = evaluateThreeWayReconciliation(indentWrongDrug, baseFhir, baseHl7, baseRxnorm);
  if (res3.overallStatus !== 'FAILED' || res3.medicationMatch !== false) {
    throw new Error(`Expected FAILED on drug mismatch, got ${res3.overallStatus}`);
  }
  console.log(`  ✓ Medication mismatch safely caught: ${res3.discrepancies[0]}`);

  // Test 4: Different Patient (MRN Mismatch) -> FAILED
  console.log('Test 4: Different Patient MRN failure...');
  const indentDiffPatient = { ...baseIndent, patientMrn: 'MRN-999999' };
  const res4 = evaluateThreeWayReconciliation(indentDiffPatient, baseFhir, baseHl7, baseRxnorm);
  if (res4.overallStatus !== 'FAILED' || res4.patientMatch !== false) {
    throw new Error(`Expected FAILED on patient mismatch, got ${res4.overallStatus}`);
  }
  console.log(`  ✓ Patient identity mismatch safely caught: ${res4.discrepancies[0]}`);

  // Test 5: Route Mismatch (Intravenous vs Subcutaneous) -> FAILED
  console.log('Test 5: Route of Administration Mismatch (IV vs SC)...');
  const indentDiffRoute = { ...baseIndent, route: 'Intravenous' };
  const res5 = evaluateThreeWayReconciliation(indentDiffRoute, baseFhir, baseHl7, baseRxnorm);
  if (res5.overallStatus !== 'FAILED' || res5.routeMatch !== false) {
    throw new Error(`Expected FAILED on route mismatch, got ${res5.overallStatus}`);
  }
  console.log(`  ✓ Route discrepancy safely caught: ${res5.discrepancies[0]}`);

  console.log('✓ All 3-Way Reconciliation unit tests passed!\n');
}

try {
  testReconciliation();
} catch (err: any) {
  console.error('✕ Reconciliation test failed:', err.message);
  process.exit(1);
}
