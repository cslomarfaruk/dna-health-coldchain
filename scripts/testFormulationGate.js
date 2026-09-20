// Tests for RxNav drug terminology lookups and formulation verification.
import { validateMedicationOrder } from '../src/services/rxnavService.js';

async function runTests() {
  console.log('Testing drug formulation verification:');

  // Test 1: Standard formulation match
  const drug1 = await validateMedicationOrder('insulin glargine', '100 UNT/ML');
  if (drug1.formulationMatch.status !== 'EXACT_MATCH') {
    console.error('  ✕ Expected EXACT_MATCH for insulin glargine 100 UNT/ML');
    process.exit(1);
  }
  console.log(`  ✓ insulin glargine 100 UNT/ML -> matched RxCUI ${drug1.rxcui} (${drug1.formulationMatch.matchedConceptName})`);

  // Test 2: Oncology formulation match
  const drug2 = await validateMedicationOrder('trastuzumab', '420 MG');
  if (drug2.formulationMatch.status !== 'EXACT_MATCH') {
    console.error('  ✕ Expected EXACT_MATCH for trastuzumab 420 MG');
    process.exit(1);
  }
  console.log(`  ✓ trastuzumab 420 MG -> matched RxCUI ${drug2.rxcui} (${drug2.formulationMatch.matchedConceptName})`);

  // Test 3: Strength mismatch safety check
  const drug3 = await validateMedicationOrder('insulin glargine', '999 UNT/ML');
  if (drug3.formulationMatch.status !== 'STRENGTH_MISMATCH') {
    console.error('  ✕ Expected STRENGTH_MISMATCH for invalid dosage');
    process.exit(1);
  }
  console.log(`  ✓ Invalid dosage 999 UNT/ML flagged: "${drug3.formulationMatch.clinicalSafetyNotes}"`);

  console.log('All drug formulation tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

