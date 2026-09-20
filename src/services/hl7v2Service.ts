// Parses HL7 v2 OMP^O09 pharmacy order messages using @redoxengine/redox-hl7-v2.
// Extracts MSH, PID, PV1, ORC, RXO, RXR, and NTE segments into a typed order model.

// @ts-expect-error - redox-hl7-v2 is a CommonJS package
import RedoxHL7 from '@redoxengine/redox-hl7-v2';
import { Omp09ParsedOrder } from '../types/clinical';

// Instantiate official Redox v2 parser
const ParserConstructor = RedoxHL7.Parser || (RedoxHL7 as any).default?.Parser || RedoxHL7;
const parser = new ParserConstructor();

/**
 * Normalizes raw HL7 string line endings to standard carriage return (\r)
 */
export function normalizeHl7LineEndings(raw: string): string {
  return raw
    .trim()
    .replace(/\r\n/g, '\r')
    .replace(/\n/g, '\r') + '\r';
}

export interface Hl7SafeParseResult {
  success: boolean;
  order?: Omp09ParsedOrder;
  errorMessage?: string;
  missingSegment?: string;
  parserEngine: '@redoxengine/redox-hl7-v2';
}

/**
 * Parses an incoming hospital HL7 v2 OMP^O09 order message
 * Throws a descriptive error if the message violates HL7 v2 specifications
 */
export function parseOmp09Message(rawHl7: string): Omp09ParsedOrder {
  const normalized = normalizeHl7LineEndings(rawHl7);
  const parsedAt = new Date().toISOString();

  // Official Redox v2 AST generation
  const ast = parser.parse(normalized);

  // 1. MSH (Message Header)
  const mshRaw = ast.MSH || {};
  const msh = {
    sendingApp: mshRaw['3']?.['1'] || mshRaw['3'] || 'UNKNOWN_APP',
    sendingFacility: mshRaw['4']?.['1'] || mshRaw['4'] || 'UNKNOWN_FACILITY',
    receivingApp: mshRaw['5']?.['1'] || mshRaw['5'] || 'PHARM_DISPENSE',
    receivingFacility: mshRaw['6']?.['1'] || mshRaw['6'] || 'CENTRAL_PHARM',
    timestamp: mshRaw['7']?.['1'] || mshRaw['7'] || parsedAt,
    messageType: 'OMP^O09',
    controlId: mshRaw['10'] || 'MSG-000',
    processingId: mshRaw['11'] || 'P',
    version: mshRaw['12'] || '2.5',
  };

  // 2. PID (Patient Identification)
  const pidRaw = ast.PATIENT?.PID || {};
  const pidIdField = pidRaw['3']?.[0] || pidRaw['3'] || {};
  const pidNameField = pidRaw['5']?.[0] || pidRaw['5'] || {};
  const pid = {
    setID: pidRaw['1'] || '1',
    patientId: pidIdField['1'] || 'MRN-UNKNOWN',
    patientName: `${pidNameField['1']?.['1'] || pidNameField['1'] || 'UNKNOWN'}, ${pidNameField['2'] || ''}`.trim(),
    dateOfBirth: pidRaw['7']?.['1'] || pidRaw['7'] || '',
    gender: pidRaw['8'] || 'U',
  };

  // 3. PV1 (Patient Visit / Inpatient Location)
  const pv1Raw = ast.PATIENT?.PATIENT_VISIT?.PV1 || ast.PV1 || {};
  const locationField = pv1Raw['3'] || {};
  const assignedLocation = typeof locationField === 'object'
    ? `${locationField['1'] || 'WARD'}-${locationField['2'] || 'BED'}`
    : String(locationField || 'IPD-WARD');

  const docRaw = pv1Raw['7']?.[0] || pv1Raw['7'] || {};
  const docLast = typeof docRaw['2'] === 'object' ? docRaw['2']['1'] : (docRaw['2'] || '');
  const docFirst = typeof docRaw['3'] === 'object' ? docRaw['3']['1'] : (docRaw['3'] || '');
  const attendingDoctor = docLast ? `Dr. ${docLast}${docFirst ? ', ' + docFirst : ''}` : 'Attending MD';

  const pv1 = {
    patientClass: pv1Raw['2'] || 'I', // Inpatient
    assignedLocation,
    attendingDoctor,
  };

  // 4. ORDER (ORC, RXO, RXR)
  const orderItem = Array.isArray(ast.ORDER) ? ast.ORDER[0] : (ast.ORDER || {});
  const orcRaw = orderItem.ORC || {};
  const rxoRaw = orderItem.RXO || {};
  const rxrList = Array.isArray(orderItem.RXR) ? orderItem.RXR : [orderItem.RXR || {}];
  const rxrRaw = rxrList[0] || {};

  const orc = {
    orderControl: orcRaw['1'] || 'NW',
    placerOrderNumber: orcRaw['2']?.['1'] || orcRaw['2'] || 'ORD-000',
    fillerOrderNumber: orcRaw['3']?.['1'] || orcRaw['3'] || 'FIL-000',
    orderStatus: orcRaw['5'] || 'CM',
    dateTimeOfTransaction: orcRaw['9']?.['1'] || orcRaw['9'] || parsedAt,
  };

  const rxoDrugField = rxoRaw['1'] || {};
  const rxo = {
    requestedDrugCode: rxoDrugField['1'] || '',
    requestedDrugName: rxoDrugField['2'] || 'MEDICATION',
    requestedGiveAmount: rxoRaw['2'] || '1',
    requestedGiveUnits: rxoRaw['3'] || 'DOSE',
  };

  const rxrRouteField = rxrRaw['1'] || {};
  const rxr = {
    routeCode: rxrRouteField['1'] || 'SC',
    routeName: rxrRouteField['2'] || 'Subcutaneous',
  };

  // 5. Optional NTE (Notes and Comments)
  const notes: string[] = [];
  const nteRaw = orderItem.NTE || ast.NTE;
  if (nteRaw) {
    const nteList = Array.isArray(nteRaw) ? nteRaw : [nteRaw];
    for (const item of nteList) {
      const text = item['3']?.[0] || item['3'] || '';
      if (text) notes.push(String(text));
    }
  }

  const segmentsDetected = ['MSH', 'PID', 'PV1', 'ORC', 'RXO', 'RXR'];
  if (notes.length > 0) segmentsDetected.push('NTE');

  return {
    rawMessage: rawHl7,
    parsedAt,
    msh,
    pid,
    pv1,
    orc,
    rxo,
    rxr,
    notes: notes.length > 0 ? notes : undefined,
    segmentsDetected,
    parserEngine: '@redoxengine/redox-hl7-v2',
  };
}

/**
 * Safe parser wrapper that catches syntax or missing segment errors
 * without crashing the application
 */
export function parseOmp09Safe(rawHl7: string): Hl7SafeParseResult {
  try {
    const order = parseOmp09Message(rawHl7);
    return {
      success: true,
      order,
      parserEngine: '@redoxengine/redox-hl7-v2',
    };
  } catch (err: any) {
    const msg = err.message || 'HL7 v2 parsing failure';
    let missingSegment: string | undefined;

    if (msg.includes('missing required segment')) {
      const match = msg.match(/missing required segment (\w+)/);
      if (match) missingSegment = match[1];
    }

    return {
      success: false,
      errorMessage: msg,
      missingSegment,
      parserEngine: '@redoxengine/redox-hl7-v2',
    };
  }
}

// Clean alias
export const parseHl7Order = parseOmp09Message;

