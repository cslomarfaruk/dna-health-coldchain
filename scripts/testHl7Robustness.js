// Tests for parsing HL7 v2 OMP^O09 order feeds using @redoxengine/redox-hl7-v2.
import { parseOmp09Message, parseOmp09Safe } from '../src/services/hl7v2Service.js';
import { SAMPLE_HL7_SCENARIOS } from '../src/data/sampleHl7Messages.js';

async function runTests() {
  console.log('Testing HL7 v2 OMP^O09 message parsing:');

  // Test 1: Standard valid message
  const validOrder = parseOmp09Message(SAMPLE_HL7_SCENARIOS[0].rawMessage);
  if (!validOrder.segmentsDetected.includes('RXO') || !validOrder.segmentsDetected.includes('RXR')) {
    console.error('  ✕ Missing required pharmacy segments');
    process.exit(1);
  }
  console.log(`  ✓ Valid order parsed: ${validOrder.rxo.requestedDrugName} for ${validOrder.pid.patientName} (${validOrder.segmentsDetected.join(', ')})`);

  // Test 2: Message with NTE segment
  const msgWithNte = [
    'MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG991|P|2.5',
    'PID|1||MRN-849201^^^HOSPITAL||DOE^JANE||19850412|F',
    'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT|||IPD',
    'ORC|NW|ORD-2026-9042|||||||20260916093000',
    'RXO|274783^INSULIN GLARGINE^RXNORM|100|UNIT',
    'NTE|1|P|COLD CHAIN: MAINTAIN AT 2-8 C. DO NOT FREEZE.',
    'RXR|SC^SUBCUTANEOUS^HL70162'
  ].join('\r') + '\r';

  const parsedNte = parseOmp09Message(msgWithNte);
  if (!parsedNte.segmentsDetected.includes('NTE') || !parsedNte.notes?.length) {
    console.error('  ✕ NTE segment not parsed');
    process.exit(1);
  }
  console.log(`  ✓ Handling notes extracted: "${parsedNte.notes[0]}"`);

  // Test 3: Missing required segment (RXR)
  const invalidMsgMissingRxr = [
    'MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG992|P|2.5',
    'PID|1||MRN-849201^^^HOSPITAL||DOE^JANE||19850412|F',
    'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT|||IPD',
    'ORC|NW|ORD-2026-9042|||||||20260916093000',
    'RXO|274783^INSULIN GLARGINE^RXNORM|100|UNIT'
  ].join('\r') + '\r';

  const safeResult = parseOmp09Safe(invalidMsgMissingRxr);
  if (safeResult.success || safeResult.missingSegment !== 'RXR') {
    console.error('  ✕ Expected missing segment RXR error');
    process.exit(1);
  }
  console.log(`  ✓ Malformed message caught: missing required segment ${safeResult.missingSegment}`);

  console.log('All HL7 v2 parsing tests passed.\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

