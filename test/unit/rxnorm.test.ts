import { validateMedicationWithRxNav } from '../../server/modules/rxnorm/rxnormService';

async function testRxNormSafety() {
  console.log('--- UNIT TEST: RxNorm & RxNav Interoperability Safety ---');

  // Test 1: Valid registered medication
  console.log('Test 1: Valid medication (Insulin Glargine 100 UNT/ML)...');
  const validDrug = await validateMedicationWithRxNav('insulin glargine', '100 UNT/ML');
  if (validDrug.validationStatus !== 'MATCHED_OFFICIAL') {
    throw new Error(`Expected MATCHED_OFFICIAL, got ${validDrug.validationStatus}`);
  }
  if (validDrug.formulationMatch.status !== 'EXACT_MATCH') {
    throw new Error(`Expected EXACT_MATCH, got ${validDrug.formulationMatch.status}`);
  }
  if (validDrug.rxcui !== '274783') {
    throw new Error(`Expected RxCUI 274783, got ${validDrug.rxcui}`);
  }
  console.log(`  ✓ Valid drug resolved: ${validDrug.officialName} (RxCUI: ${validDrug.rxcui}) [${validDrug.formulationMatch.status}]`);

  // Test 2: CRITICAL SAFETY TEST - Unknown medication must NOT become Insulin Glargine (Finding #8)
  console.log('Test 2: Unknown medication must NOT resolve to Insulin Glargine (RxCUI 274783)...');
  const unknownDrug = await validateMedicationWithRxNav('unregistered_synthetic_drug_xyz9999', '50 MG');
  if (unknownDrug.validationStatus !== 'NOT_FOUND') {
    throw new Error(`CRITICAL FAILURE: Unknown drug was assigned status ${unknownDrug.validationStatus} instead of NOT_FOUND`);
  }
  if (unknownDrug.rxcui === '274783') {
    throw new Error('CRITICAL SAFETY VIOLATION: Unknown drug fell back to Insulin Glargine RxCUI 274783!');
  }
  if (unknownDrug.formulationMatch.status !== 'UNREGISTERED_FORMULATION') {
    throw new Error(`Expected UNREGISTERED_FORMULATION, got ${unknownDrug.formulationMatch.status}`);
  }
  console.log('  ✓ Unknown drug rejected safely: status NOT_FOUND, no unsafe fallback assigned');

  // Test 3: Strength mismatch detection
  console.log('Test 3: Strength mismatch (Insulin Glargine 999 UNT/ML)...');
  const mismatchDrug = await validateMedicationWithRxNav('insulin glargine', '999 UNT/ML');
  if (mismatchDrug.formulationMatch.status !== 'STRENGTH_MISMATCH') {
    throw new Error(`Expected STRENGTH_MISMATCH, got ${mismatchDrug.formulationMatch.status}`);
  }
  // Test 4: Direct RxNorm RxCUI code lookup
  console.log('Test 4: Direct standard RxNorm RxCUI lookup (RxCUI 274783)...');
  const directCuiDrug = await validateMedicationWithRxNav('274783');
  if (directCuiDrug.validationStatus !== 'MATCHED_OFFICIAL' || directCuiDrug.rxcui !== '274783') {
    throw new Error(`Expected MATCHED_OFFICIAL with RxCUI 274783, got ${directCuiDrug.validationStatus}`);
  }
  if (!directCuiDrug.isRefrigeratedColdChain) {
    throw new Error('Expected RxCUI 274783 to be classified as refrigerated cold-chain');
  }
  console.log(`  ✓ Standard RxNorm code lookup verified: ${directCuiDrug.officialName} (RxCUI: ${directCuiDrug.rxcui})`);

  // Test 5: Standard LOINC Code System Verification (Anti-Pattern Red Flag prevention)
  console.log('Test 5: Standard LOINC code lookups (LOINC system: http://loinc.org)...');
  const { LOINC_CODES } = await import('../../server/modules/rxnorm/rxnormService');
  if (LOINC_CODES.STORAGE_TEMPERATURE !== '75203-0' || LOINC_CODES.BLOOD_PRESSURE_SYSTOLIC !== '8480-6') {
    throw new Error('LOINC standard codes mismatch');
  }
  console.log(`  ✓ Standard LOINC codes verified: Storage Temp [${LOINC_CODES.STORAGE_TEMPERATURE}], BP Systolic [${LOINC_CODES.BLOOD_PRESSURE_SYSTOLIC}]`);

  console.log('✓ All RxNorm safety and LOINC standards tests passed!\n');
}

testRxNormSafety().catch((err) => {
  console.error('✕ RxNorm test failed:', err.message);
  process.exit(1);
});
