/**
 * DNA Health Pharmacy Cold-Chain Interoperability Types
 * Adhering to HL7 FHIR R4, RxNorm/RxNav, HL7 v2 OMP^O09, and HIPAA Safe Harbor
 */

// ==========================================
// 1. FHIR R4 Core Interfaces
// ==========================================

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface FhirDosage {
  text?: string;
  timing?: {
    repeat?: {
      frequency?: number;
      period?: number;
      periodUnit?: string;
    };
  };
  route?: FhirCodeableConcept;
  doseAndRate?: Array<{
    doseQuantity?: FhirQuantity;
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  identifier?: FhirIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed';
  intent: 'order' | 'plan' | 'proposal';
  category?: FhirCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  authoredOn: string;
  requester?: FhirReference;
  dosageInstruction?: FhirDosage[];
  note?: Array<{ text: string }>;
}

export interface FhirMedicationDispense {
  resourceType: 'MedicationDispense';
  id: string;
  identifier?: FhirIdentifier[];
  status: 'preparation' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  authorizingPrescription?: FhirReference[];
  performer?: Array<{
    actor: FhirReference;
  }>;
  location?: FhirReference;
  quantity?: FhirQuantity;
  whenPrepared?: string;
  whenHandedOver?: string;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueDecimal?: number;
    valueDateTime?: string;
  }>;
  note?: Array<{ text: string }>;
}

export interface FhirAuditEvent {
  resourceType: 'AuditEvent';
  id: string;
  type: FhirCoding;
  subtype?: FhirCoding[];
  action: 'C' | 'R' | 'U' | 'D' | 'E'; // Create, Read, Update, Delete, Execute
  recorded: string;
  outcome: '0' | '4' | '8' | '12'; // 0 = Success, 4 = Minor fail, 8 = Serious fail, 12 = Major fail
  outcomeDesc?: string;
  agent: Array<{
    type?: FhirCodeableConcept;
    who: FhirReference;
    requestor: boolean;
    network?: {
      address?: string;
      type?: string;
    };
  }>;
  source: {
    observer: FhirReference;
    type?: FhirCoding[];
  };
  entity?: Array<{
    what: FhirReference;
    type?: FhirCoding;
    role?: FhirCoding;
    securityLabel?: FhirCoding[];
    description?: string;
  }>;
}

// ==========================================
// 2. NIH NLM RxNav / RxNorm Types
// ==========================================

export interface RxNavIdGroup {
  idGroup: {
    name?: string;
    rxnormId?: string[];
  };
}

export interface RxNormConceptProperty {
  rxcui: string;
  name: string;
  synonym?: string;
  tty: string; // Term Type (e.g. IN=Ingredient, SCD=Semantic Clinical Drug, SBD=Semantic Branded Drug)
  language?: string;
  suppress?: string;
  umlscui?: string;
}

export interface RxNavAllRelatedGroup {
  allRelatedGroup?: {
    conceptGroup?: Array<{
      tty: string;
      conceptProperties?: RxNormConceptProperty[];
    }>;
  };
}

export interface FormulationMatchResult {
  status: 'EXACT_MATCH' | 'ACCEPTABLE_EQUIVALENT' | 'STRENGTH_MISMATCH' | 'UNREGISTERED_FORMULATION';
  prescribedStrength: string;
  matchedConceptName?: string;
  matchedScdRxcui?: string;
  clinicalSafetyNotes: string;
}

export interface ValidatedDrugInfo {
  queryName: string;
  rxcui: string;
  officialName: string;
  termType: string;
  formulation: string;
  isRefrigeratedColdChain: boolean;
  requiredTempRange: {
    minCelsius: number;
    maxCelsius: number;
  };
  activeIngredients: string[];
  availableForms: string[];
  validationStatus: 'MATCHED_OFFICIAL' | 'INFERRED' | 'NOT_FOUND';
  formulationMatch: FormulationMatchResult;
  fetchedAt: string;
}

// ==========================================
// 3. HL7 v2 OMP^O09 Legacy Order Types
// ==========================================

export interface Hl7MshSegment {
  sendingApp: string;
  sendingFacility: string;
  receivingApp: string;
  receivingFacility: string;
  timestamp: string;
  messageType: string;
  controlId: string;
  processingId: string;
  version: string;
}

export interface Hl7PidSegment {
  setID?: string;
  patientId: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface Hl7Pv1Segment {
  patientClass: string;
  assignedLocation: string;
  attendingDoctor?: string;
}

export interface Hl7OrcSegment {
  orderControl: string; // NW = New Order, OK = Order Accepted
  placerOrderNumber: string;
  fillerOrderNumber?: string;
  orderStatus?: string;
  dateTimeOfTransaction?: string;
  orderingProvider?: string;
}

export interface Hl7RxoSegment {
  requestedDrugCode: string;
  requestedDrugName: string;
  requestedGiveAmount: string;
  requestedGiveUnits: string;
}

export interface Hl7RxrSegment {
  routeCode: string;
  routeName: string;
}

export interface Omp09ParsedOrder {
  rawMessage: string;
  parsedAt: string;
  msh: Hl7MshSegment;
  pid: Hl7PidSegment;
  pv1: Hl7Pv1Segment;
  orc: Hl7OrcSegment;
  rxo: Hl7RxoSegment;
  rxr: Hl7RxrSegment;
  notes?: string[];
  segmentsDetected: string[];
  parserEngine: '@redoxengine/redox-hl7-v2';
}

// ==========================================
// 4. Cold-Chain Telemetry & Courier Types
// ==========================================

export type ColdChainStep =
  | 'ORDER_RECEIVED'
  | 'RXNORM_VALIDATED'
  | 'PACKED_IN_COOLER'
  | 'COURIER_DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED_TO_WARD'
  | 'REFRIGERATED_STORED';

export interface ColdChainTelemetry {
  coolerBoxId: string;
  sensorProbeId: string;
  currentTempCelsius: number;
  targetRangeCelsius: [number, number]; // e.g. [2.0, 8.0]
  batteryPercent: number;
  lastPingTime: string;
  status: 'NOMINAL' | 'EXCURSION_HIGH' | 'EXCURSION_LOW';
}

export interface CourierAssignment {
  courierId: string;
  courierName: string;
  dispatchTime: string;
  estimatedArrivalMinutes: number;
  destinationFloor: string;
  destinationWardFridge: string;
}

// ==========================================
// 5. HIPAA Safe Harbor & Outbound Alert Types
// ==========================================

export interface RawClinicalOrder {
  orderId: string;
  // Direct PHI elements to be removed:
  patientFullName: string;
  patientMrn: string;
  patientDob: string;
  patientPhone: string;
  patientRoomBed: string;
  // Clinical data:
  medicationName: string;
  medicationRxcui: string;
  dosage: string;
  route: string;
  orderingPhysician: string;
}

export interface DeIdentifiedNurseAlert {
  alertId: string;
  tokenizedOrderRef: string; // e.g. "ORD-CC-9821"
  destinationDropZone: string; // e.g. "Ward 4B - Fridge Lockbox A"
  medicationClassification: string; // e.g. "Refrigerated Biologic [Cold Chain 2°C-8°C]"
  courierIdentifier: string; // e.g. "James M. (Courier #409)"
  estimatedArrivalTimestamp: string;
  estimatedMinutesAway: number;
  specialHandlingInstructions: string;
  containsPhi: false;
  sanitizedFieldsCount: number;
  cryptographicToken: string;
}

export interface HipaaSanitizationReport {
  safeHarborCompliant: boolean;
  scrubbedIdentifiers: Array<{
    identifierType: string;
    originalValueMasked: string;
    actionTaken: 'STRIPPED' | 'TOKENIZED_NON_REVERSIBLE' | 'GENERALIZED_ZONE';
  }>;
  sha256AuditDigest: string;
}

// ==========================================
// 6. SMART on FHIR OAuth 2.0 PKCE Interfaces
// ==========================================

export interface SmartPkceContext {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
  clientId: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  requestedScopes: string[];
}

export interface SmartClinicianIdentity {
  practitionerId: string;
  fullName: string;
  role: string;
  npi: string;
  organization: string;
  email: string;
}

export interface SmartAuthSession {
  isAuthenticated: boolean;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // e.g. 3600 seconds
  issuedAt: string;
  expiresAt: string;
  grantedScopes: string[];
  patientContextId: string;
  user: SmartClinicianIdentity;
  pkceHandshake: {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: 'S256';
    exchangeLatencyMs: number;
  };
  revoked?: boolean;
}

