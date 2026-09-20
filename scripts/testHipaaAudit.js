// Tests for HIPAA Safe Harbor de-identification and FHIR AuditEvent generation.
import { sanitizeOutboundNurseAlert, verifyZeroPhiLeak } from '../src/services/hipaaSanitizer.js';
import { buildFhirAuditEvent } from '../src/services/fhirAuditService.js';
import { buildFhirMedicationDispense, buildFhirMedicationRequest } from '../src/services/fhirDispenseService.js';
import { packageColdChainMedication } from '../src/services/coldChainService.js';
import { parseOmp09Message } from '../src/services/hl7v2Service.js';
import { validateMedicationOrder } from '../src/services/rxnavService.js';
import { SAMPLE_HL7_SCENARIOS } from '../src/data/sampleHl7Messages.js';

async function runTests() {
  console.log('Testing HIPAA Safe Harbor de-identification & AuditEvents:');

  for (const scenario of SAMPLE_HL7_SCENARIOS) {
    const parsedHl7 = parseOmp09Message(scenario.rawMessage);
    const validatedDrug = await validateMedicationOrder(parsedHl7.rxo.requestedDrugName);
    const coolerPkg = packageColdChainMedication(
      validatedDrug.officialName,
      validatedDrug.rxcui,
      parsedHl7.pv1.assignedLocation,
      12
    );

    // Sanitize
    const { alert, report } = await sanitizeOutboundNurseAlert(parsedHl7, coolerPkg);

    // Check PHI leak
    const leakCheck = verifyZeroPhiLeak(alert, parsedHl7);
    if (!leakCheck.isLeakFree) {
      console.error(`  ✕ PHI leak detected in ${scenario.title}:`, leakCheck.violations);
      process.exit(1);
    }

    // Build AuditEvent
    const medReq = buildFhirMedicationRequest(parsedHl7, validatedDrug);
    const medDisp = buildFhirMedicationDispense(medReq, coolerPkg);
    const auditEvent = buildFhirAuditEvent(medDisp, report);

    if (!auditEvent.entity?.[0]?.description?.includes(report.sha256AuditDigest)) {
      console.error(`  ✕ SHA-256 digest missing from AuditEvent for ${scenario.title}`);
      process.exit(1);
    }

    console.log(`  ✓ ${scenario.title}: PHI scrubbed (token: ${alert.tokenizedOrderRef}, digest: ${report.sha256AuditDigest.slice(0, 16)}...)`);
  }

  console.log('All HIPAA de-identification & AuditEvent tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

