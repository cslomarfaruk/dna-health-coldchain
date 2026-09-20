// Tests for building and submitting FHIR MedicationDispense records.
import { buildFhirMedicationRequest, buildFhirMedicationDispense } from '../src/services/fhirDispenseService.js';
import { packageColdChainMedication } from '../src/services/coldChainService.js';
import { parseOmp09Message } from '../src/services/hl7v2Service.js';
import { validateMedicationOrder } from '../src/services/rxnavService.js';
import { submitMedicationDispenseToEhr, DEFAULT_FHIR_SERVERS } from '../src/services/fhirClient.js';
import { SAMPLE_HL7_SCENARIOS } from '../src/data/sampleHl7Messages.js';

async function runTests() {
  console.log('Testing FHIR MedicationDispense workflow:');

  // Setup test data
  const scenario = SAMPLE_HL7_SCENARIOS[0];
  const parsedHl7 = parseOmp09Message(scenario.rawMessage);
  const validatedDrug = await validateMedicationOrder(parsedHl7.rxo.requestedDrugName, '100 UNT/ML');
  const medReq = buildFhirMedicationRequest(parsedHl7, validatedDrug);

  // Test 1: Package medication
  const coolerPkg = packageColdChainMedication(
    validatedDrug.officialName,
    validatedDrug.rxcui,
    parsedHl7.pv1.assignedLocation,
    10
  );
  console.log(`  ✓ Packed ${coolerPkg.drugName} into ${coolerPkg.coolerBoxId} at ${coolerPkg.currentTempCelsius}°C (courier: ${coolerPkg.courier.courierName})`);

  // Test 2: Build resource & check extensions
  const medDispense = buildFhirMedicationDispense(medReq, coolerPkg);
  const tempRangeExt = medDispense.extension.find((e) => e.url.includes('cold-chain-temp-range'));
  const courierExt = medDispense.extension.find((e) => e.url.includes('courier-assignment'));
  const etaExt = medDispense.extension.find((e) => e.url.includes('courier-eta'));
  const coolerBoxExt = medDispense.extension.find((e) => e.url.includes('cooler-box-id'));

  if (!tempRangeExt || !courierExt || !etaExt || !coolerBoxExt) {
    console.error('  ✕ Missing cold chain or courier extensions');
    process.exit(1);
  }
  console.log(`  ✓ MedicationDispense resource built with cold-chain extensions (temp, courier, ETA)`);

  // Test 3: Submit to EHR gateway
  const writeResult = await submitMedicationDispenseToEhr(medDispense, DEFAULT_FHIR_SERVERS[1]);
  if (writeResult.httpStatus !== 201 || !writeResult.success) {
    console.error('  ✕ Writeback to EHR failed');
    process.exit(1);
  }
  console.log(`  ✓ Posted to ${writeResult.urlCalled} -> HTTP 201 Created (${writeResult.latencyMs}ms)`);

  console.log('All MedicationDispense tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

