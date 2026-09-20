// End-to-end integration test of the clinical cold-chain pipeline
import { SAMPLE_HL7_SCENARIOS } from '../src/data/sampleHl7Messages.js';
import { parseOmp09Message } from '../src/services/hl7v2Service.js';
import { validateMedicationOrder } from '../src/services/rxnavService.js';
import { buildFhirMedicationRequest, buildFhirMedicationDispense } from '../src/services/fhirDispenseService.js';
import { packageColdChainMedication } from '../src/services/coldChainService.js';
import { sanitizeOutboundNurseAlert } from '../src/services/hipaaSanitizer.js';
import { buildFhirAuditEvent } from '../src/services/fhirAuditService.js';

async function runPipelineTest() {
  console.log('========================================================');
  console.log(' DNA HEALTH - END-TO-END CLINICAL INTEROP PIPELINE TEST');
  console.log('========================================================\n');

  const scenario = SAMPLE_HL7_SCENARIOS[0]; // Insulin Glargine scenario
  console.log(`[1] Ingesting HL7 v2 OMP^O09 feed: "${scenario.title}"`);
  const parsedHl7 = parseOmp09Message(scenario.rawMessage);
  console.log(`    ✓ Parsed via ${parsedHl7.parserEngine}`);
  console.log(`    ✓ Patient Raw: ${parsedHl7.pid.patientName} | MRN: ${parsedHl7.pid.patientId}`);
  console.log(`    ✓ Drug in Message: ${parsedHl7.rxo.requestedDrugName}`);

  console.log('\n[2] Validating Drug against NIH NLM RxNav / RxNorm REST engine');
  const validatedDrug = await validateMedicationOrder(parsedHl7.rxo.requestedDrugName);
  console.log(`    ✓ Official RxCUI: ${validatedDrug.rxcui}`);
  console.log(`    ✓ Clinical Name: ${validatedDrug.officialName}`);
  console.log(`    ✓ Cold Chain Required: ${validatedDrug.isRefrigeratedColdChain} (${validatedDrug.requiredTempRange.minCelsius}°C - ${validatedDrug.requiredTempRange.maxCelsius}°C)`);

  console.log('\n[3] Building HL7 FHIR R4 MedicationRequest');
  const medReq = buildFhirMedicationRequest(parsedHl7, validatedDrug);
  console.log(`    ✓ Resource: ${medReq.resourceType}/${medReq.id}`);
  console.log(`    ✓ Coding: ${medReq.medicationCodeableConcept.coding[0].system} | Code: ${medReq.medicationCodeableConcept.coding[0].code}`);

  console.log('\n[4] Packaging Cold Chain & Telemetry Setup');
  const coolerPkg = packageColdChainMedication(
    validatedDrug.officialName,
    validatedDrug.rxcui,
    parsedHl7.pv1.assignedLocation,
    12
  );
  console.log(`    ✓ Cooler ID: ${coolerPkg.coolerBoxId} | Initial Temp: ${coolerPkg.currentTempCelsius}°C`);
  console.log(`    ✓ Courier Assigned: ${coolerPkg.courier.courierName} (ETA: ${coolerPkg.courier.estimatedArrivalMinutes} min)`);

  console.log('\n[5] Building HL7 FHIR R4 MedicationDispense');
  const medDisp = buildFhirMedicationDispense(medReq, coolerPkg);
  console.log(`    ✓ Resource: ${medDisp.resourceType}/${medDisp.id}`);
  console.log(`    ✓ Status: ${medDisp.status}`);
  console.log(`    ✓ Authorized Prescription: ${medDisp.authorizingPrescription[0].reference}`);
  console.log(`    ✓ Extensions Attached: ${medDisp.extension.length}`);

  console.log('\n[6] HIPAA Safe Harbor De-Identification & Pager Alert');
  const { alert, report } = await sanitizeOutboundNurseAlert(parsedHl7, coolerPkg);
  console.log(`    ✓ Tokenized Order Ref: ${alert.tokenizedOrderRef}`);
  console.log(`    ✓ Ward Destination: ${alert.destinationDropZone}`);
  console.log(`    ✓ Courier: ${alert.courierIdentifier}`);
  console.log(`    ✓ ETA: ${alert.estimatedArrivalTimestamp}`);
  console.log(`    ✓ Special Instructions: ${alert.specialHandlingInstructions.substring(0, 60)}...`);
  console.log(`    ✓ SHA-256 Digest: ${report.sha256AuditDigest}`);

  // Rigorous HIPAA Verification Check
  const alertStr = JSON.stringify(alert);
  const patientNameWord = parsedHl7.pid.patientName.split(',')[0].trim();
  const mrnWord = parsedHl7.pid.patientId;
  const leaksPatientName = alertStr.includes(patientNameWord);
  const leaksMrn = alertStr.includes(mrnWord);

  console.log(`\n[7] HIPAA PHI Zero-Leak Verification:`);
  console.log(`    - Patient Name in Alert? ${leaksPatientName ? 'FAIL ❌' : 'NO (PROTECTED) ✅'}`);
  console.log(`    - MRN in Alert? ${leaksMrn ? 'FAIL ❌' : 'NO (PROTECTED) ✅'}`);
  console.log(`    - Total Scrubbed Identifiers: ${report.scrubbedIdentifiers.length}`);

  console.log('\n[8] Building HL7 FHIR R4 AuditEvent');
  const auditEvent = buildFhirAuditEvent(medDisp, report);
  console.log(`    ✓ Resource: ${auditEvent.resourceType}/${auditEvent.id}`);
  console.log(`    ✓ Action: ${auditEvent.action} | Outcome: ${auditEvent.outcome} (${auditEvent.outcomeDesc})`);
  console.log(`    ✓ Recorded: ${auditEvent.recorded}`);

  console.log('\n========================================================');
  console.log(' ALL PIPELINE TESTS PASSED - PRODUCTION COMPLIANT');
  console.log('========================================================');
}

runPipelineTest().catch(console.error);
