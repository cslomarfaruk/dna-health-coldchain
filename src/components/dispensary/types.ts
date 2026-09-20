import {
  Omp09ParsedOrder,
  FhirMedicationRequest,
  FhirMedicationDispense,
  FhirAuditEvent,
  ValidatedDrugInfo,
  DeIdentifiedNurseAlert,
  HipaaSanitizationReport,
} from '../../types/clinical';
import { CoolerPackage } from '../../services/coldChainService';
import { ReconciliationSummary } from '../HL7v2Viewer';
import { SampleHl7Scenario } from '../../data/sampleHl7Messages';

export interface ScheduledSurgery {
  caseId: string;
  procedureName: string;
  operatingRoom: string;
  leadSurgeon: string;
  readiness: 'CLEARED_FOR_INCISION' | 'SURGICAL_HOLD_ENGAGED';
  safetyHoldNote?: string;
}

export const SCHEDULED_SURGERY_BY_MRN: Record<string, ScheduledSurgery> = {
  'MRN-849201': {
    caseId: 'surg-case-001',
    procedureName: 'Right Total Hip Arthroplasty (THA)',
    operatingRoom: 'OR Suite 3 - Main Surgical Pavilion',
    leadSurgeon: 'Dr. Sarah Al-Mansoor, MD, FACS',
    readiness: 'CLEARED_FOR_INCISION',
  },
  'MRN-782104': {
    caseId: 'surg-case-002-missing-consent',
    procedureName: 'Laparoscopic Cholecystectomy',
    operatingRoom: 'OR Suite 1 - Minimally Invasive Surgery',
    leadSurgeon: 'Dr. Robert Kaplan, MD, FACS',
    readiness: 'SURGICAL_HOLD_ENGAGED',
    safetyHoldNote: 'Safety Hold: Missing signed surgical consent form in EHR.',
  },
  'MRN-719302': {
    caseId: 'surg-case-002-missing-consent',
    procedureName: 'Laparoscopic Cholecystectomy',
    operatingRoom: 'OR Suite 1 - Minimally Invasive Surgery',
    leadSurgeon: 'Dr. Robert Kaplan, MD, FACS',
    readiness: 'SURGICAL_HOLD_ENGAGED',
    safetyHoldNote: 'Safety Hold: Missing signed surgical consent form in EHR.',
  },
  'MRN-551920': {
    caseId: 'surg-case-003-antibiotic-allergy',
    procedureName: 'Coronary Artery Bypass Graft (CABG x3)',
    operatingRoom: 'Cardiac OR 2',
    leadSurgeon: 'Dr. Elena Rostova, MD, FACS',
    readiness: 'SURGICAL_HOLD_ENGAGED',
    safetyHoldNote: 'Safety Hold: Severe Penicillin / Cefazolin anaphylaxis allergy.',
  },
  'MRN-554109': {
    caseId: 'surg-case-003-antibiotic-allergy',
    procedureName: 'Coronary Artery Bypass Graft (CABG x3)',
    operatingRoom: 'Cardiac OR 2',
    leadSurgeon: 'Dr. Elena Rostova, MD, FACS',
    readiness: 'SURGICAL_HOLD_ENGAGED',
    safetyHoldNote: 'Safety Hold: Severe Penicillin / Cefazolin anaphylaxis allergy.',
  },
  'MRN-449120': {
    caseId: 'surg-case-004-high-inr',
    procedureName: 'Lumbar Spinal Decompression & Fusion (L4-L5)',
    operatingRoom: 'OR Suite 5 - Neurosurgery',
    leadSurgeon: 'Dr. Sarah Al-Mansoor, MD, FACS',
    readiness: 'SURGICAL_HOLD_ENGAGED',
    safetyHoldNote: 'Safety Hold: Coagulopathy bleeding risk (INR 2.8, Platelets 42K).',
  },
};


export interface DispensaryStepItem {
  num: number;
  title: string;
  standard: string;
  badge: string;
  isComplete: boolean;
  hasError: boolean;
}

export interface DispensaryHeaderProps {
  coolerPackage: CoolerPackage;
  isColdChainExcursion: boolean;
  showTempControls: boolean;
  onToggleTempControls: () => void;
  onUpdateTemp: (temp: number) => void;
  pharmacistName: string;
  backendError: string | null;
  onClearBackendError: () => void;
}

export interface DispatchedDossierBannerProps {
  onViewBySteps: () => void;
  coolerPackage: CoolerPackage;
}

export interface DispensaryStepperProps {
  steps: DispensaryStepItem[];
  activeStep: number;
  maxUnlockedStep: number;
  isStepAccessible: (stepNum: number) => boolean;
  stepNotice: string | null;
  onClearStepNotice: () => void;
  onStepClick: (stepNum: number) => void;
  isOrderDispatched: boolean;
  onShowAllInfo: () => void;
}

export interface DispensaryMedicationQueueProps {
  availableIndents: any[];
  activeIndent: any;
  onSelectIndent: (indent: any) => void;
  onClearSelection?: () => void;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  scenarios: SampleHl7Scenario[];
  queueSearch: string;
  onSearchChange: (val: string) => void;
  queueFilter: 'ALL' | 'PENDING' | 'DISPATCHED';
  onFilterChange: (filter: 'ALL' | 'PENDING' | 'DISPATCHED') => void;
}

export interface DispensaryEmptyStateProps {
  availableIndents: any[];
  onSelectFirstPending: () => void;
  onSelectScenario: (id: string) => void;
}

export interface DispensaryCertificationFooterProps {
  pharmacistName: string;
}

export interface Step1ReadPrescriptionProps {
  isAllInfoView?: boolean;
  activeIndent: any;
  parsedOrder: Omp09ParsedOrder;
  fhirMedRequest: FhirMedicationRequest;
  surgeryContext?: ScheduledSurgery;
  prescribedDose: string;
  prescribedUnits: string;
  orderKey: string;
  onAdvanceToStep2?: () => void;
  expandedJson: Record<string, boolean>;
  onToggleJson: (key: string) => void;
}

export interface Step2ValidateDrugProps {
  isAllInfoView?: boolean;
  validatedDrug: ValidatedDrugInfo;
  prescribedDrug: string;
  orderKey: string;
  onAdvanceToStep3?: () => void;
  onBackToStep1?: () => void;
}

export interface Step3ProcessDeliveryProps {
  isAllInfoView?: boolean;
  parsedOrder: Omp09ParsedOrder;
  activeIndent: any;
  fhirMedRequest: FhirMedicationRequest;
  concordancePassed: boolean;
  requestedDrug: string;
  requestedDose: string;
  requestedUnits: string;
  prescribedDrug: string;
  prescribedDose: string;
  prescribedUnits: string;
  orderKey: string;
  reconciliation?: ReconciliationSummary | null;
  onAdvanceToStep4?: () => void;
  onBackToStep2?: () => void;
  expandedJson: Record<string, boolean>;
  onToggleJson: (key: string) => void;
}

export interface Step4ApproveDispatchProps {
  isAllInfoView?: boolean;
  coolerPackage: CoolerPackage;
  isColdChainExcursion: boolean;
  concordancePassed: boolean;
  isOrderDispatched: boolean;
  isFulfilling: boolean;
  onAuthorizeFulfillment: () => Promise<boolean>;
  fhirMedDispense: FhirMedicationDispense;
  pharmacistName: string;
  orderKey: string;
  nurseAlert?: DeIdentifiedNurseAlert;
  backendError?: string | null;
  onClearBackendError?: () => void;
  onAdvanceToStep5?: () => void;
  onBackToStep3?: () => void;
  expandedJson: Record<string, boolean>;
  onToggleJson: (key: string) => void;
}

export interface Step5HipaaComplianceProps {
  isAllInfoView?: boolean;
  hipaaReport: HipaaSanitizationReport;
  nurseAlert: DeIdentifiedNurseAlert;
  fhirAuditEvent: FhirAuditEvent;
  isOrderDispatched: boolean;
  activeWorkflow?: any;
  activeIndent?: any;
  pharmacistName?: string;
  onBackToStep4?: () => void;
  onBackToStep1?: () => void;
  expandedJson: Record<string, boolean>;
  onToggleJson: (key: string) => void;
}

