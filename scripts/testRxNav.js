// Live verification test for RxNav API integration
import { validateMedicationOrder } from '../src/services/rxnavService.js';

async function runTest() {
  console.log('--- Testing Live NIH NLM RxNav Integration ---');

  const testDrugs = [
    'insulin glargine',
    'trastuzumab',
    'filgrastim',
    'amoxicillin'
  ];

  for (const drug of testDrugs) {
    console.log(`\nQuerying: "${drug}"...`);
    const result = await validateMedicationOrder(drug);
    console.log(`✓ RxCUI: ${result.rxcui}`);
    console.log(`✓ Official Name: ${result.officialName}`);
    console.log(`✓ Term Type: ${result.termType}`);
    console.log(`✓ Cold Chain Required: ${result.isRefrigeratedColdChain} (${result.requiredTempRange.minCelsius}°C - ${result.requiredTempRange.maxCelsius}°C)`);
    console.log(`✓ Available Formulations Sample (${result.availableForms.length} total):`, result.availableForms.slice(0, 2));
  }

  console.log('\n--- Live RxNav Verification Complete: All Lookups Succeeded ---');
}

runTest().catch(console.error);
