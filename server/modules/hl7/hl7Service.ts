// @ts-expect-error - redox-hl7-v2 is a CommonJS package
import RedoxHL7 from '@redoxengine/redox-hl7-v2';
import { phiSafeLog } from '../../middleware/phiLogger';

const ParserConstructor = RedoxHL7.Parser || (RedoxHL7 as any).default?.Parser || RedoxHL7;
const parser = new ParserConstructor();

export interface ParsedHl7Omp09 {
  rawMessage: string;
  msh: {
    sendingApp: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
    timestamp: string;
    messageType: string;
    messageCode: string;
    triggerEvent: string;
    controlId: string; // MSH-10
    version: string;
  };
  pid: {
    patientId: string; // PID-3 (Required)
    patientName: string; // PID-5
    dateOfBirth?: string;
    gender?: string;
  };
  pv1: {
    patientClass: string;
    assignedLocation: string; // PV1-3
    attendingDoctor?: string;
  };
  orc: {
    orderControl: string; // ORC-1
    placerOrderNumber: string; // ORC-2 (Required)
    fillerOrderNumber?: string;
    orderStatus?: string;
    dateTimeOfTransaction?: string;
  };
  rxo: {
    drugCode: string; // RXO-1
    drugName: string;
    giveAmount: string; // RXO-2
    giveUnits: string; // RXO-3
  };
  rxr: {
    routeCode: string; // RXR-1
    routeName: string;
  };
  notes: string[]; // NTE
  segmentsDetected: string[];
}

function normalizeHl7LineEndings(hl7: string): string {
  return hl7.replace(/\r\n/g, '\r').replace(/\n/g, '\r').trim();
}

/**
 * Parses and strictly validates an HL7 v2 message as an OMP^O09 Pharmacy Order.
 * Throws an Error if:
 * 1. MSH-9 message type is not OMP^O09 (e.g. ADT^A01, ORM^O01 rejected)
 * 2. PID-3 (Patient ID) is missing or empty
 * 3. ORC-2 (Placer Order Number) is missing or empty
 * 4. RXO-1 (Medication) is missing
 * 5. MSH-10 (Control ID) is missing
 */
export function parseAndValidateOmp09(rawHl7: string): ParsedHl7Omp09 {
  if (!rawHl7 || typeof rawHl7 !== 'string' || !rawHl7.trim()) {
    throw new Error('HL7_VALIDATION_ERROR: Empty or invalid HL7 payload provided');
  }

  const normalized = normalizeHl7LineEndings(rawHl7);

  // 1. First parse MSH segment via Redox segment parser to enforce OMP^O09 message type
  const firstLineEnd = normalized.indexOf('\r');
  const mshLine = firstLineEnd !== -1 ? normalized.slice(0, firstLineEnd) : normalized;

  let mshSegmentAst: any;
  try {
    mshSegmentAst = parser.parseSegment(mshLine, 'MSH');
  } catch (err: any) {
    throw new Error(`HL7_VALIDATION_ERROR: Failed to parse MSH header: ${err.message}`);
  }

  const msgTypeRaw = mshSegmentAst?.['9'] || {};
  const messageCode = typeof msgTypeRaw === 'object' ? (msgTypeRaw['1'] || '') : String(msgTypeRaw || '');
  const triggerEvent = typeof msgTypeRaw === 'object' ? (msgTypeRaw['2'] || '') : '';
  const rawMessageType = triggerEvent ? `${messageCode}^${triggerEvent}` : messageCode;

  // STRICT VALIDATION: Enforce OMP^O09 Pharmacy Order Message Type
  if (messageCode !== 'OMP' || triggerEvent !== 'O09') {
    throw new Error(
      `HL7_MESSAGE_TYPE_REJECTED: Expected pharmacy order message type OMP^O09, but received "${rawMessageType || 'UNKNOWN'}". Message rejected.`
    );
  }

  // 2. Official Open-Source Redox HL7 v2 AST Parsing for full OMP^O09 message hierarchy
  let ast: any;
  try {
    ast = parser.parse(normalized);
  } catch (parseErr: any) {
    throw new Error(`HL7_VALIDATION_ERROR: ${parseErr.message}`);
  }

  if (!ast || !ast.MSH) {
    throw new Error('HL7_VALIDATION_ERROR: Missing MSH (Message Header) segment in AST');
  }

  const mshRaw = ast.MSH || mshSegmentAst;

  // Extract MSH-10 Control ID
  const controlId = (typeof mshRaw['10'] === 'object' ? mshRaw['10']?.['1'] : mshRaw['10']) || '';
  if (!controlId || controlId.trim() === '') {
    throw new Error('HL7_VALIDATION_ERROR: MSH-10 Message Control ID is required for message deduplication');
  }

  const sendingApp = (typeof mshRaw['3'] === 'object' ? mshRaw['3']?.['1'] : mshRaw['3']) || 'UNKNOWN_APP';
  const sendingFacility = (typeof mshRaw['4'] === 'object' ? mshRaw['4']?.['1'] : mshRaw['4']) || '';
  const timestamp = (typeof mshRaw['7'] === 'object' ? mshRaw['7']?.['1'] : mshRaw['7']) || new Date().toISOString();
  const version = (typeof mshRaw['12'] === 'object' ? mshRaw['12']?.['1'] : mshRaw['12']) || '2.5';

  // 2. PID Segment
  const pidRaw = ast.PATIENT?.PID || ast.PID;
  if (!pidRaw) {
    throw new Error('HL7_VALIDATION_ERROR: Missing PID (Patient Identification) segment in pharmacy order');
  }

  const pid3Field = pidRaw['3']?.[0] || pidRaw['3'];
  const patientId = (typeof pid3Field === 'object' ? pid3Field?.['1'] : pid3Field) || '';
  if (!patientId || patientId.trim() === '') {
    // CRITICAL: Reject missing patient ID instead of fake MRN-UNKNOWN
    throw new Error('HL7_VALIDATION_ERROR: PID-3 Patient Identifier is missing. Silently generating placeholder MRN is prohibited.');
  }

  const pid5Field = pidRaw['5']?.[0] || pidRaw['5'] || {};
  const lastName = (typeof pid5Field === 'object' ? (pid5Field?.['1']?.['1'] || pid5Field?.['1']) : pid5Field) || '';
  const firstName = (typeof pid5Field === 'object' ? pid5Field?.['2'] : '') || '';
  const patientName = `${lastName}, ${firstName}`.trim().replace(/^,\s*|,\s*$/g, '');

  const dateOfBirth = (typeof pidRaw['7'] === 'object' ? pidRaw['7']?.['1'] : pidRaw['7']) || '';
  const gender = pidRaw['8'] || 'U';

  // 3. PV1 Segment
  const pv1Raw = ast.PATIENT?.PATIENT_VISIT?.PV1 || ast.PV1 || {};
  const locationField = pv1Raw['3'] || {};
  const assignedLocation = typeof locationField === 'object'
    ? `${locationField['1'] || 'WARD'}-${locationField['2'] || 'BED'}`
    : String(locationField || 'IPD-WARD');

  const docRaw = pv1Raw['7']?.[0] || pv1Raw['7'] || {};
  const docLast = typeof docRaw['2'] === 'object' ? docRaw['2']['1'] : (docRaw['2'] || '');
  const docFirst = typeof docRaw['3'] === 'object' ? docRaw['3']['1'] : (docRaw['3'] || '');
  const attendingDoctor = docLast ? `Dr. ${docLast}${docFirst ? ', ' + docFirst : ''}` : 'Attending Physician';

  // 4. ORDER Segments (ORC, RXO, RXR)
  const orderItem = Array.isArray(ast.ORDER) ? ast.ORDER[0] : (ast.ORDER || {});
  const orcRaw = orderItem.ORC || ast.ORC;
  if (!orcRaw) {
    throw new Error('HL7_VALIDATION_ERROR: Missing ORC (Common Order) segment in OMP^O09 message');
  }

  const placerOrderNumber = (typeof orcRaw['2'] === 'object' ? orcRaw['2']?.['1'] : orcRaw['2']) || '';
  if (!placerOrderNumber || placerOrderNumber.trim() === '') {
    // CRITICAL: Reject missing order ID instead of fake ORD-000
    throw new Error('HL7_VALIDATION_ERROR: ORC-2 Placer Order Number is missing. Silently generating placeholder order ID is prohibited.');
  }

  const orderControl = orcRaw['1'] || 'NW';
  const orderStatus = orcRaw['5'] || 'CM';
  const dateTimeOfTransaction = (typeof orcRaw['9'] === 'object' ? orcRaw['9']?.['1'] : orcRaw['9']) || timestamp;

  // RXO Segment
  const rxoRaw = orderItem.RXO || ast.RXO;
  if (!rxoRaw) {
    throw new Error('HL7_VALIDATION_ERROR: Missing RXO (Pharmacy Prescription Order) segment in OMP^O09 message');
  }

  const drugField = rxoRaw['1'] || {};
  const drugCode = (typeof drugField === 'object' ? drugField['1'] : '') || '';
  const drugName = (typeof drugField === 'object' ? (drugField['2'] || drugField['1']) : String(drugField)) || '';
  if (!drugName || drugName.trim() === '') {
    throw new Error('HL7_VALIDATION_ERROR: RXO-1 Requested Drug Name is missing');
  }

  const giveAmount = String((typeof rxoRaw['2'] === 'object' ? rxoRaw['2']?.['1'] : rxoRaw['2']) || '1');
  const giveUnits = String((typeof rxoRaw['3'] === 'object' ? (rxoRaw['3']?.['1'] || rxoRaw['3']?.['2']) : rxoRaw['3']) || 'UNIT');

  // RXR Segment
  const rxrList = Array.isArray(orderItem.RXR) ? orderItem.RXR : [orderItem.RXR || ast.RXR || {}];
  const rxrRaw = rxrList[0] || {};
  const routeField = rxrRaw['1'] || {};
  const routeCode = (typeof routeField === 'object' ? routeField['1'] : '') || 'SC';
  const routeName = (typeof routeField === 'object' ? (routeField['2'] || routeField['1']) : String(routeField)) || 'Subcutaneous';

  // Notes (NTE)
  const notesList = Array.isArray(orderItem.NTE) ? orderItem.NTE : (orderItem.NTE ? [orderItem.NTE] : []);
  const notes: string[] = [];
  for (const nte of notesList) {
    const commentField = nte['3']?.[0] || nte['3'] || '';
    const text = typeof commentField === 'object' ? commentField['1'] : String(commentField);
    if (text) notes.push(text);
  }

  const segmentsDetected = Object.keys(ast).filter((k) => !k.startsWith('_'));

  return {
    rawMessage: normalized,
    msh: {
      sendingApp,
      sendingFacility,
      timestamp,
      messageType: rawMessageType,
      messageCode,
      triggerEvent,
      controlId,
      version,
    },
    pid: {
      patientId,
      patientName,
      dateOfBirth,
      gender,
    },
    pv1: {
      patientClass: pv1Raw['2'] || 'I',
      assignedLocation,
      attendingDoctor,
    },
    orc: {
      orderControl,
      placerOrderNumber,
      orderStatus,
      dateTimeOfTransaction,
    },
    rxo: {
      drugCode,
      drugName,
      giveAmount,
      giveUnits,
    },
    rxr: {
      routeCode,
      routeName,
    },
    notes,
    segmentsDetected,
  };
}
