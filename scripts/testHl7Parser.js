// Verification test for Redox HL7 v2 parser
import { parseOmp09Message } from '../src/services/hl7v2Service.js';
import { SAMPLE_HL7_SCENARIOS } from '../src/data/sampleHl7Messages.js';

console.log('--- Testing Redox HL7 v2 OMP^O09 Parsing Engine ---');

for (const scenario of SAMPLE_HL7_SCENARIOS) {
  console.log(`\nParsing Scenario: ${scenario.title}`);
  try {
    const parsed = parseOmp09Message(scenario.rawMessage);
    console.log(`✓ Parser Engine: ${parsed.parserEngine}`);
    console.log(`✓ Message Type: ${parsed.msh.messageType} (${parsed.msh.sendingApp} -> ${parsed.msh.receivingApp})`);
    console.log(`✓ Patient: ${parsed.pid.patientName} (MRN: ${parsed.pid.patientId})`);
    console.log(`✓ Inpatient Unit: ${parsed.pv1.assignedLocation} (Attending: ${parsed.pv1.attendingDoctor})`);
    console.log(`✓ Order Number: ${parsed.orc.placerOrderNumber} (Control: ${parsed.orc.orderControl})`);
    console.log(`✓ Drug Ordered: [${parsed.rxo.requestedDrugCode}] ${parsed.rxo.requestedDrugName} (${parsed.rxo.requestedGiveAmount} ${parsed.rxo.requestedGiveUnits})`);
    console.log(`✓ Administration Route: ${parsed.rxr.routeName} (Code: ${parsed.rxr.routeCode})`);
    console.log(`✓ Segments Detected: ${parsed.segmentsDetected.join(', ')}`);
  } catch (err) {
    console.error(`✗ Failed to parse scenario ${scenario.id}:`, err);
    process.exit(1);
  }
}

console.log('\n--- All HL7 v2 OMP^O09 Messages Successfully Parsed with @redoxengine/redox-hl7-v2 ---');
