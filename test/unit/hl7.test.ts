import { parseAndValidateOmp09 } from '../../server/modules/hl7/hl7Service';

function testHl7Validation() {
  console.log('--- UNIT TEST: HL7 v2 OMP^O09 Standards Validation ---');

  // Test 1: Valid OMP^O09 message
  console.log('Test 1: Valid OMP^O09 message parsing...');
  const validHl7 = [
    'MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-2026-9042|P|2.5',
    'PID|1||MRN-849201^^^HOSPITAL||WARREN^ELIZABETH||19720418|F',
    'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT|||IPD',
    'ORC|NW|ORD-2026-9042|||||||20260916093000',
    'RXO|274783^INSULIN GLARGINE^RXNORM|100|UNIT',
    'NTE|1|P|COLD CHAIN: MAINTAIN AT 2-8 C. DO NOT FREEZE.',
    'RXR|SC^SUBCUTANEOUS^HL70162',
  ].join('\r') + '\r';

  const order = parseAndValidateOmp09(validHl7);
  if (order.msh.messageType !== 'OMP^O09') {
    throw new Error(`Expected OMP^O09, got ${order.msh.messageType}`);
  }
  if (order.pid.patientId !== 'MRN-849201') {
    throw new Error(`Expected MRN-849201, got ${order.pid.patientId}`);
  }
  if (order.orc.placerOrderNumber !== 'ORD-2026-9042') {
    throw new Error(`Expected ORD-2026-9042, got ${order.orc.placerOrderNumber}`);
  }
  if (order.rxo.giveAmount !== '100' || order.rxo.giveUnits !== 'UNIT') {
    throw new Error(`Expected 100 UNIT, got ${order.rxo.giveAmount} ${order.rxo.giveUnits}`);
  }
  console.log(`  ✓ Valid OMP^O09 parsed: Order ${order.orc.placerOrderNumber} for Patient ${order.pid.patientId} (${order.rxo.drugName})`);

  // Test 2: Reject wrong message type ADT^A01
  console.log('Test 2: Reject non-OMP^O09 message type (ADT^A01)...');
  const adtHl7 = [
    'MSH|^~\\&|ADT_SYSTEM|HOSPITAL|CENTRAL_PHARM|HOSPITAL|20260916093000||ADT^A01|MSG-9912|P|2.5',
    'PID|1||MRN-849201^^^HOSPITAL||WARREN^ELIZABETH||19720418|F',
    'PV1|1|I|WARD-4B^BED-12^04',
  ].join('\r') + '\r';

  let adtRejected = false;
  try {
    parseAndValidateOmp09(adtHl7);
  } catch (err: any) {
    if (err.message.includes('HL7_MESSAGE_TYPE_REJECTED')) {
      adtRejected = true;
      console.log(`  ✓ Successfully rejected ADT^A01 message`);
    }
  }
  if (!adtRejected) {
    throw new Error('FAILURE: ADT^A01 message was improperly accepted as OMP^O09!');
  }

  // Test 3: Reject missing patient identifier PID-3 (No silent MRN-UNKNOWN substitution)
  console.log('Test 3: Reject missing PID-3 patient identifier...');
  const missingPidHl7 = [
    'MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-9913|P|2.5',
    'PID|1||||WARREN^ELIZABETH||19720418|F', // Missing PID-3
    'PV1|1|I|WARD-4B^BED-12^04',
    'ORC|NW|ORD-2026-9042',
    'RXO|274783^INSULIN GLARGINE|100|UNIT',
    'RXR|SC^SUBCUTANEOUS',
  ].join('\r') + '\r';

  let missingPidRejected = false;
  try {
    parseAndValidateOmp09(missingPidHl7);
  } catch (err: any) {
    if (err.message.includes('PID-3 Patient Identifier is missing')) {
      missingPidRejected = true;
      console.log(`  ✓ Missing PID-3 rejected without silent substitution`);
    }
  }
  if (!missingPidRejected) {
    throw new Error('FAILURE: Missing patient identifier was not rejected!');
  }

  // Test 4: Reject missing placer order number ORC-2
  console.log('Test 4: Reject missing ORC-2 order identifier...');
  const missingOrcHl7 = [
    'MSH|^~\\&|EPIC_EHR|HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-9914|P|2.5',
    'PID|1||MRN-849201||WARREN^ELIZABETH',
    'PV1|1|I|WARD-4B',
    'ORC|NW|', // Missing ORC-2
    'RXO|274783^INSULIN GLARGINE|100|UNIT',
    'RXR|SC^SUBCUTANEOUS',
  ].join('\r') + '\r';

  let missingOrcRejected = false;
  try {
    parseAndValidateOmp09(missingOrcHl7);
  } catch (err: any) {
    if (err.message.includes('ORC-2 Placer Order Number is missing')) {
      missingOrcRejected = true;
      console.log(`  ✓ Missing ORC-2 rejected without silent substitution`);
    }
  }
  if (!missingOrcRejected) {
    throw new Error('FAILURE: Missing order number was not rejected!');
  }

  console.log('✓ All HL7 v2 OMP^O09 unit tests passed!\n');
}

try {
  testHl7Validation();
} catch (err: any) {
  console.error('✕ HL7 test failed:', err.message);
  process.exit(1);
}
