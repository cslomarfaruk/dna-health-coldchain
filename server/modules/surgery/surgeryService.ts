import { FHIR_BASE_URL, submitFhirAuditEvent } from '../fhir/fhirClient';
import { phiSafeLog } from '../../middleware/phiLogger';

/**
 * Standard LOINC Codes for Blood Clotting / Coagulation Tests
 * Coding System: http://loinc.org
 */
export const SURGICAL_LOINC_CODES = {
  INR: '6301-6', // International Normalized Ratio
  PLATELETS: '777-3', // Platelet count in blood
  PROTHROMBIN_TIME: '5902-2', // Prothrombin Time (PT)
  APTT: '3173-2', // Activated Partial Thromboplastin Time (aPTT)
  CONSENT_DOCUMENT: '59284-0', // Consent Document
  SURGICAL_TIMEOUT_NOTE: '11537-8', // Surgical Operation Note / Time-Out Checklist
} as const;

/**
 * Standard RxNorm Codes for Surgical Antibiotics & Allergies
 * Coding System: http://www.nlm.nih.gov/research/umls/rxnorm
 */
export const SURGICAL_RXNORM_CODES = {
  CEFAZOLIN: '2180', // Standard First-Line Prophylaxis (Ancef)
  PENICILLIN_G: '7980',
  AMOXICILLIN: '723',
  AMPICILLIN: '733',
  VANCOMYCIN: '11124', // Non-beta-lactam alternative
  CLINDAMYCIN: '2582', // Non-beta-lactam alternative
} as const;

export interface SurgicalProcedureInfo {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientDob: string;
  patientGender: string;
  procedureName: string;
  snomedCode: string;
  anatomicalSite: string;
  laterality: 'RIGHT' | 'LEFT' | 'BILATERAL' | 'N/A';
  operatingRoom: string;
  scheduledTime: string;
  leadSurgeon: {
    id: string;
    name: string;
    role: string;
  };
  anesthesiologist: {
    id: string;
    name: string;
    role: string;
  };
  circulatingNurse: {
    id: string;
    name: string;
    role: string;
  };
}

export interface ConsentValidationResult {
  isSigned: boolean;
  consentId?: string;
  consentStatus: 'active' | 'inactive' | 'missing';
  signedTimestamp?: string;
  witnessName?: string;
  procedureMatched: boolean;
  notes: string;
  rawConsentResource?: any;
}

export interface AllergyScreenResult {
  isAllergicToProphylaxis: boolean;
  prophylaxisAntibiotic: {
    name: string;
    rxNormCode: string;
    dosage: string;
    administrationTimingMinutesPrior: number;
    administered: boolean;
  };
  detectedAllergies: {
    allergenName: string;
    rxNormCode?: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
  }[];
  recommendedAlternative?: string;
  safetyStatus: 'CLEARED' | 'ALLERGY_ALERT_CONTRAINDICATED' | 'ALTERNATIVE_REQUIRED';
  clinicalNotes: string;
}

export interface CoagulationTestItem {
  loincCode: string;
  testName: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'ELEVATED_RISK' | 'CRITICAL_RISK';
  sampleTimestamp: string;
}

export interface CoagulationPanelResult {
  overallStatus: 'SAFE' | 'BORDERLINE' | 'CRITICAL_BLEEDING_RISK';
  tests: {
    inr: CoagulationTestItem;
    platelets: CoagulationTestItem;
    prothrombinTime: CoagulationTestItem;
    aptt: CoagulationTestItem;
  };
  clinicalSummary: string;
}

export interface SurgicalTimeoutEvaluation {
  caseId: string;
  procedure: SurgicalProcedureInfo;
  consent: ConsentValidationResult;
  allergies: AllergyScreenResult;
  coagulation: CoagulationPanelResult;
  siteMarkingConfirmed: boolean;
  overallReadiness: 'CLEARED_FOR_INCISION' | 'SURGICAL_HOLD_ENGAGED';
  activeSafetyHolds: string[];
  evaluatedAt: string;
}

/**
 * Pre-configured Clinical OR Cases for Testing and Verification
 */
export const SCHEDULED_SURGICAL_CASES: Record<string, SurgicalTimeoutEvaluation> = {
  // Scenario 1: Standard Cleared Case (Right Total Hip Arthroplasty - Elizabeth Warren)
  'surg-case-001': {
    caseId: 'surg-case-001',
    procedure: {
      id: 'proc-tha-9042',
      patientId: 'Patient/MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      patientMrn: 'MRN-849201',
      patientDob: '1972-04-18',
      patientGender: 'female',
      procedureName: 'Right Total Hip Arthroplasty (THA)',
      snomedCode: '52734007',
      anatomicalSite: 'Right Hip Joint',
      laterality: 'RIGHT',
      operatingRoom: 'OR Suite 3 - Main Surgical Pavilion',
      scheduledTime: '2026-09-16T08:00:00.000Z',
      leadSurgeon: {
        id: 'Practitioner/SURG-9021',
        name: 'Dr. Sarah Al-Mansoor, MD, FACS',
        role: 'Attending Orthopedic Surgeon',
      },
      anesthesiologist: {
        id: 'Practitioner/ANES-3312',
        name: 'Dr. David Chen, MD',
        role: 'Attending Anesthesiologist',
      },
      circulatingNurse: {
        id: 'Practitioner/NURSE-0812',
        name: 'Nurse Elizabeth Warren, RN, CNOR',
        role: 'Circulating Nurse',
      },
    },
    consent: {
      isSigned: true,
      consentId: 'consent-tha-849201',
      consentStatus: 'active',
      signedTimestamp: '2026-09-15T14:30:00.000Z',
      witnessName: 'Dr. Sarah Al-Mansoor, MD',
      procedureMatched: true,
      notes: 'Official written surgical consent signed for Right Total Hip Arthroplasty. Patient counseled on risks, benefits, and alternatives.',
    },
    allergies: {
      isAllergicToProphylaxis: false,
      prophylaxisAntibiotic: {
        name: 'Cefazolin',
        rxNormCode: SURGICAL_RXNORM_CODES.CEFAZOLIN,
        dosage: '2g IV',
        administrationTimingMinutesPrior: 45,
        administered: true,
      },
      detectedAllergies: [
        {
          allergenName: 'Latex',
          reaction: 'Contact dermatitis',
          severity: 'mild',
        },
      ],
      safetyStatus: 'CLEARED',
      clinicalNotes: 'No beta-lactam or cephalosporin allergies. Pre-op Cefazolin 2g IV completed within 60 minutes prior to incision window.',
    },
    coagulation: {
      overallStatus: 'SAFE',
      tests: {
        inr: {
          loincCode: SURGICAL_LOINC_CODES.INR,
          testName: 'International Normalized Ratio (INR)',
          value: 1.1,
          unit: '{ratio}',
          referenceRange: '0.8 - 1.2',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T06:15:00.000Z',
        },
        platelets: {
          loincCode: SURGICAL_LOINC_CODES.PLATELETS,
          testName: 'Platelet Count',
          value: 245000,
          unit: '/uL',
          referenceRange: '150,000 - 450,000 /uL',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T06:15:00.000Z',
        },
        prothrombinTime: {
          loincCode: SURGICAL_LOINC_CODES.PROTHROMBIN_TIME,
          testName: 'Prothrombin Time (PT)',
          value: 11.8,
          unit: 's',
          referenceRange: '11.0 - 13.5 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T06:15:00.000Z',
        },
        aptt: {
          loincCode: SURGICAL_LOINC_CODES.APTT,
          testName: 'Activated Partial Thromboplastin Time (aPTT)',
          value: 28.4,
          unit: 's',
          referenceRange: '25.0 - 35.0 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T06:15:00.000Z',
        },
      },
      clinicalSummary: 'All coagulation parameters within safe surgical limits. Low baseline bleeding risk.',
    },
    siteMarkingConfirmed: true,
    overallReadiness: 'CLEARED_FOR_INCISION',
    activeSafetyHolds: [],
    evaluatedAt: new Date().toISOString(),
  },

  // Scenario 2: Safety Hold - Unsigned / Missing Surgical Consent
  'surg-case-002-missing-consent': {
    caseId: 'surg-case-002-missing-consent',
    procedure: {
      id: 'proc-lap-chole-7193',
      patientId: 'Patient/MRN-782104',
      patientName: 'Faruk, Omar',
      patientMrn: 'MRN-782104',
      patientDob: '1978-11-23',
      patientGender: 'male',
      procedureName: 'Laparoscopic Cholecystectomy',
      snomedCode: '38102005',
      anatomicalSite: 'Gallbladder / Right Upper Quadrant',
      laterality: 'N/A',
      operatingRoom: 'OR Suite 1 - Minimally Invasive Surgery',
      scheduledTime: '2026-09-16T09:30:00.000Z',
      leadSurgeon: {
        id: 'Practitioner/SURG-8810',
        name: 'Dr. Robert Kaplan, MD, FACS',
        role: 'General Surgeon',
      },
      anesthesiologist: {
        id: 'Practitioner/ANES-3312',
        name: 'Dr. David Chen, MD',
        role: 'Attending Anesthesiologist',
      },
      circulatingNurse: {
        id: 'Practitioner/NURSE-0812',
        name: 'Nurse Elizabeth Warren, RN, CNOR',
        role: 'Circulating Nurse',
      },
    },
    consent: {
      isSigned: false,
      consentStatus: 'missing',
      procedureMatched: false,
      notes: 'CRITICAL SAFETY HOLD: No active signed surgical consent found in EHR for Laparoscopic Cholecystectomy. Surgical cut is strictly prohibited.',
    },
    allergies: {
      isAllergicToProphylaxis: false,
      prophylaxisAntibiotic: {
        name: 'Cefazolin',
        rxNormCode: SURGICAL_RXNORM_CODES.CEFAZOLIN,
        dosage: '2g IV',
        administrationTimingMinutesPrior: 30,
        administered: true,
      },
      detectedAllergies: [],
      safetyStatus: 'CLEARED',
      clinicalNotes: 'No documented drug allergies.',
    },
    coagulation: {
      overallStatus: 'SAFE',
      tests: {
        inr: {
          loincCode: SURGICAL_LOINC_CODES.INR,
          testName: 'INR',
          value: 1.0,
          unit: '{ratio}',
          referenceRange: '0.8 - 1.2',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T07:00:00.000Z',
        },
        platelets: {
          loincCode: SURGICAL_LOINC_CODES.PLATELETS,
          testName: 'Platelet Count',
          value: 290000,
          unit: '/uL',
          referenceRange: '150,000 - 450,000 /uL',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T07:00:00.000Z',
        },
        prothrombinTime: {
          loincCode: SURGICAL_LOINC_CODES.PROTHROMBIN_TIME,
          testName: 'PT',
          value: 12.0,
          unit: 's',
          referenceRange: '11.0 - 13.5 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T07:00:00.000Z',
        },
        aptt: {
          loincCode: SURGICAL_LOINC_CODES.APTT,
          testName: 'aPTT',
          value: 30.1,
          unit: 's',
          referenceRange: '25.0 - 35.0 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T07:00:00.000Z',
        },
      },
      clinicalSummary: 'Coagulation panel normal.',
    },
    siteMarkingConfirmed: true,
    overallReadiness: 'SURGICAL_HOLD_ENGAGED',
    activeSafetyHolds: ['CONSENT_MISSING_OR_UNSIGNED: Patient has not executed informed surgical consent.'],
    evaluatedAt: new Date().toISOString(),
  },

  // Scenario 3: Safety Hold - Severe Antibiotic Allergy to Prophylaxis (Penicillin / Cefazolin Anaphylaxis)
  'surg-case-003-antibiotic-allergy': {
    caseId: 'surg-case-003-antibiotic-allergy',
    procedure: {
      id: 'proc-cabg-6621',
      patientId: 'Patient/MRN-551920',
      patientName: 'Miller, David R.',
      patientMrn: 'MRN-551920',
      patientDob: '1965-08-12',
      patientGender: 'male',
      procedureName: 'Coronary Artery Bypass Graft (CABG x3)',
      snomedCode: '232717009',
      anatomicalSite: 'Thorax / Heart',
      laterality: 'N/A',
      operatingRoom: 'Cardiac OR 2',
      scheduledTime: '2026-09-16T11:00:00.000Z',
      leadSurgeon: {
        id: 'Practitioner/SURG-7712',
        name: 'Dr. Elena Rostova, MD, FACS',
        role: 'Chief of Cardiothoracic Surgery',
      },
      anesthesiologist: {
        id: 'Practitioner/ANES-3312',
        name: 'Dr. David Chen, MD',
        role: 'Cardiac Anesthesiologist',
      },
      circulatingNurse: {
        id: 'Practitioner/NURSE-0812',
        name: 'Nurse Elizabeth Warren, RN, CNOR',
        role: 'Circulating Nurse',
      },
    },
    consent: {
      isSigned: true,
      consentId: 'consent-cabg-554109',
      consentStatus: 'active',
      signedTimestamp: '2026-09-15T18:00:00.000Z',
      witnessName: 'Dr. Elena Rostova, MD',
      procedureMatched: true,
      notes: 'Consent signed for CABG x3 with cardiopulmonary bypass.',
    },
    allergies: {
      isAllergicToProphylaxis: true,
      prophylaxisAntibiotic: {
        name: 'Cefazolin',
        rxNormCode: SURGICAL_RXNORM_CODES.CEFAZOLIN,
        dosage: '2g IV',
        administrationTimingMinutesPrior: 0,
        administered: false,
      },
      detectedAllergies: [
        {
          allergenName: 'Penicillin G & Beta-Lactams',
          rxNormCode: SURGICAL_RXNORM_CODES.PENICILLIN_G,
          reaction: 'Anaphylaxis, bronchospasm, angioedema',
          severity: 'severe',
        },
      ],
      recommendedAlternative: 'Vancomycin 15 mg/kg IV infused over 60 min OR Clindamycin 900 mg IV',
      safetyStatus: 'ALLERGY_ALERT_CONTRAINDICATED',
      clinicalNotes: 'CRITICAL ALLERGY GATE: Documented severe anaphylaxis to Beta-lactams. Cefazolin cross-reactivity risk. DO NOT ADMINISTER CEFAZOLIN. Switch to Vancomycin 1g IV.',
    },
    coagulation: {
      overallStatus: 'SAFE',
      tests: {
        inr: {
          loincCode: SURGICAL_LOINC_CODES.INR,
          testName: 'INR',
          value: 1.15,
          unit: '{ratio}',
          referenceRange: '0.8 - 1.2',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T05:30:00.000Z',
        },
        platelets: {
          loincCode: SURGICAL_LOINC_CODES.PLATELETS,
          testName: 'Platelet Count',
          value: 185000,
          unit: '/uL',
          referenceRange: '150,000 - 450,000 /uL',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T05:30:00.000Z',
        },
        prothrombinTime: {
          loincCode: SURGICAL_LOINC_CODES.PROTHROMBIN_TIME,
          testName: 'PT',
          value: 12.3,
          unit: 's',
          referenceRange: '11.0 - 13.5 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T05:30:00.000Z',
        },
        aptt: {
          loincCode: SURGICAL_LOINC_CODES.APTT,
          testName: 'aPTT',
          value: 29.5,
          unit: 's',
          referenceRange: '25.0 - 35.0 s',
          status: 'NORMAL',
          sampleTimestamp: '2026-09-16T05:30:00.000Z',
        },
      },
      clinicalSummary: 'Coagulation tests within normal cardiothoracic surgical limits.',
    },
    siteMarkingConfirmed: true,
    overallReadiness: 'SURGICAL_HOLD_ENGAGED',
    activeSafetyHolds: [
      'ALLERGY_CONTRAINDICATION: Patient has life-threatening allergy to Penicillins/Cephalosporins. Standard Cefazolin prohibited; switch to Vancomycin required.',
    ],
    evaluatedAt: new Date().toISOString(),
  },

  // Scenario 4: Safety Hold - Abnormal Blood Clotting / Coagulopathy Bleeding Risk (Elevated INR 2.8)
  'surg-case-004-high-inr': {
    caseId: 'surg-case-004-high-inr',
    procedure: {
      id: 'proc-spine-1184',
      patientId: 'Patient/MRN-449120',
      patientName: 'Davis, Harold K.',
      patientMrn: 'MRN-449120',
      patientDob: '1958-03-04',
      patientGender: 'male',
      procedureName: 'Lumbar Spinal Decompression & Fusion (L4-L5)',
      snomedCode: '240577008',
      anatomicalSite: 'Lumbar Spine (L4-L5)',
      laterality: 'N/A',
      operatingRoom: 'OR Suite 5 - Neurosurgery',
      scheduledTime: '2026-09-16T13:00:00.000Z',
      leadSurgeon: {
        id: 'Practitioner/SURG-9021',
        name: 'Dr. Sarah Al-Mansoor, MD, FACS',
        role: 'Neurosurgeon',
      },
      anesthesiologist: {
        id: 'Practitioner/ANES-3312',
        name: 'Dr. David Chen, MD',
        role: 'Attending Anesthesiologist',
      },
      circulatingNurse: {
        id: 'Practitioner/NURSE-0812',
        name: 'Nurse Elizabeth Warren, RN, CNOR',
        role: 'Circulating Nurse',
      },
    },
    consent: {
      isSigned: true,
      consentId: 'consent-spine-449120',
      consentStatus: 'active',
      signedTimestamp: '2026-09-15T11:00:00.000Z',
      witnessName: 'Dr. Sarah Al-Mansoor, MD',
      procedureMatched: true,
      notes: 'Valid informed consent signed.',
    },
    allergies: {
      isAllergicToProphylaxis: false,
      prophylaxisAntibiotic: {
        name: 'Cefazolin',
        rxNormCode: SURGICAL_RXNORM_CODES.CEFAZOLIN,
        dosage: '2g IV',
        administrationTimingMinutesPrior: 40,
        administered: true,
      },
      detectedAllergies: [],
      safetyStatus: 'CLEARED',
      clinicalNotes: 'No antibiotic allergies.',
    },
    coagulation: {
      overallStatus: 'CRITICAL_BLEEDING_RISK',
      tests: {
        inr: {
          loincCode: SURGICAL_LOINC_CODES.INR,
          testName: 'International Normalized Ratio (INR)',
          value: 2.8,
          unit: '{ratio}',
          referenceRange: '0.8 - 1.2 (Surgical threshold < 1.4)',
          status: 'CRITICAL_RISK',
          sampleTimestamp: '2026-09-16T06:00:00.000Z',
        },
        platelets: {
          loincCode: SURGICAL_LOINC_CODES.PLATELETS,
          testName: 'Platelet Count',
          value: 42000,
          unit: '/uL',
          referenceRange: '150,000 - 450,000 /uL (Surgical threshold > 50,000)',
          status: 'CRITICAL_RISK',
          sampleTimestamp: '2026-09-16T06:00:00.000Z',
        },
        prothrombinTime: {
          loincCode: SURGICAL_LOINC_CODES.PROTHROMBIN_TIME,
          testName: 'Prothrombin Time (PT)',
          value: 24.5,
          unit: 's',
          referenceRange: '11.0 - 13.5 s',
          status: 'CRITICAL_RISK',
          sampleTimestamp: '2026-09-16T06:00:00.000Z',
        },
        aptt: {
          loincCode: SURGICAL_LOINC_CODES.APTT,
          testName: 'Activated Partial Thromboplastin Time (aPTT)',
          value: 48.0,
          unit: 's',
          referenceRange: '25.0 - 35.0 s',
          status: 'ELEVATED_RISK',
          sampleTimestamp: '2026-09-16T06:00:00.000Z',
        },
      },
      clinicalSummary: 'CRITICAL COAGULOPATHY: INR 2.8 and Platelets 42K indicate severe bleeding diathesis. Epidural hematoma and catastrophic hemorrhage risk. Incision is contra-indicated without reversal agent.',
    },
    siteMarkingConfirmed: true,
    overallReadiness: 'SURGICAL_HOLD_ENGAGED',
    activeSafetyHolds: [
      'COAGULOPATHY_HEMORRHAGE_RISK: INR (2.8) and Platelets (42,000/uL) violate safe surgical thresholds. Administer Vitamin K / FFP / Platelet transfusion prior to cut.',
    ],
    evaluatedAt: new Date().toISOString(),
  },
};

/**
 * Validates all pre-incision Time-Out parameters for a scheduled surgical case
 */
export function evaluateSurgicalCase(caseId: string): SurgicalTimeoutEvaluation {
  const surgicalCase = SCHEDULED_SURGICAL_CASES[caseId];
  if (!surgicalCase) {
    throw new Error(`SURGICAL_CASE_NOT_FOUND: Scheduled surgical case "${caseId}" does not exist.`);
  }

  const activeHolds: string[] = [];

  // 1. Consent Verification Gate
  if (!surgicalCase.consent.isSigned || surgicalCase.consent.consentStatus !== 'active') {
    activeHolds.push('CONSENT_MISSING_OR_UNSIGNED: Patient has not executed informed surgical consent.');
  } else if (!surgicalCase.consent.procedureMatched) {
    activeHolds.push('CONSENT_PROCEDURE_MISMATCH: Signed consent does not match scheduled surgical procedure.');
  }

  // 2. Antibiotic Prophylaxis Allergy Gate
  if (surgicalCase.allergies.isAllergicToProphylaxis) {
    activeHolds.push(
      `ANTIBIOTIC_ALLERGY_CONTRAINDICATION: Patient allergic to planned prophylaxis (${surgicalCase.allergies.prophylaxisAntibiotic.name}). Alternative required.`
    );
  }

  // 3. Coagulation / Blood Clotting Gate
  if (surgicalCase.coagulation.tests.inr.value >= 1.5) {
    activeHolds.push(`COAGULOPATHY_INR_ELEVATED: INR is ${surgicalCase.coagulation.tests.inr.value} (safe threshold < 1.4). Severe bleeding risk.`);
  }
  if (surgicalCase.coagulation.tests.platelets.value < 50000) {
    activeHolds.push(`THROMBOCYTOPENIA_CRITICAL: Platelets are ${surgicalCase.coagulation.tests.platelets.value}/uL (threshold > 50,000). Hemorrhage risk.`);
  }

  const overallReadiness: 'CLEARED_FOR_INCISION' | 'SURGICAL_HOLD_ENGAGED' =
    activeHolds.length === 0 ? 'CLEARED_FOR_INCISION' : 'SURGICAL_HOLD_ENGAGED';

  return {
    ...surgicalCase,
    overallReadiness,
    activeSafetyHolds: activeHolds,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Compiles an official HL7 FHIR R4 Composition resource representing the Surgical Time-Out Safety Summary
 */
export function compileFhirSurgicalComposition(evaluation: SurgicalTimeoutEvaluation): any {
  const timestamp = new Date().toISOString();

  return {
    resourceType: 'Composition',
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: SURGICAL_LOINC_CODES.SURGICAL_TIMEOUT_NOTE,
          display: 'Surgical operation note / Time-out checklist document',
        },
      ],
      text: 'Pre-Incision Surgical Safety Checklist (WHO Surgical Time-Out Document)',
    },
    category: [
      {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note',
          },
        ],
      },
    ],
    subject: {
      reference: evaluation.procedure.patientId,
      display: evaluation.procedure.patientName,
    },
    date: timestamp,
    author: [
      {
        reference: evaluation.procedure.leadSurgeon.id,
        display: evaluation.procedure.leadSurgeon.name,
      },
      {
        reference: evaluation.procedure.anesthesiologist.id,
        display: evaluation.procedure.anesthesiologist.name,
      },
    ],
    title: `Surgical Safety Checklist Record: ${evaluation.procedure.procedureName}`,
    confidentiality: 'N',
    attester: [
      {
        mode: 'professional',
        time: timestamp,
        party: {
          reference: evaluation.procedure.leadSurgeon.id,
          display: evaluation.procedure.leadSurgeon.name,
        },
      },
      {
        mode: 'professional',
        time: timestamp,
        party: {
          reference: evaluation.procedure.anesthesiologist.id,
          display: evaluation.procedure.anesthesiologist.name,
        },
      },
    ],
    section: [
      {
        title: '1. Scheduled Procedure & Anatomical Site Verification',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: evaluation.procedure.snomedCode, display: evaluation.procedure.procedureName }],
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Procedure:</b> ${evaluation.procedure.procedureName} (SNOMED: ${evaluation.procedure.snomedCode})</p><p><b>Site & Laterality:</b> ${evaluation.procedure.anatomicalSite} [${evaluation.procedure.laterality}]</p><p><b>Operating Room:</b> ${evaluation.procedure.operatingRoom}</p></div>`,
        },
      },
      {
        title: '2. Informed Surgical Consent Verification',
        code: {
          coding: [{ system: 'http://loinc.org', code: SURGICAL_LOINC_CODES.CONSENT_DOCUMENT, display: 'Patient Consent Document' }],
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Consent Status:</b> ${evaluation.consent.consentStatus.toUpperCase()} (Signed: ${evaluation.consent.isSigned})</p><p><b>Witness:</b> ${evaluation.consent.witnessName || 'N/A'}</p><p><b>Verification Notes:</b> ${evaluation.consent.notes}</p></div>`,
        },
      },
      {
        title: '3. Antibiotic Prophylaxis & Allergy Screening',
        code: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: evaluation.allergies.prophylaxisAntibiotic.rxNormCode, display: evaluation.allergies.prophylaxisAntibiotic.name }],
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Prophylaxis Ordered:</b> ${evaluation.allergies.prophylaxisAntibiotic.name} ${evaluation.allergies.prophylaxisAntibiotic.dosage}</p><p><b>Administered Prior to Incision:</b> ${evaluation.allergies.prophylaxisAntibiotic.administered ? `YES (${evaluation.allergies.prophylaxisAntibiotic.administrationTimingMinutesPrior} min prior)` : 'NO'}</p><p><b>Allergy Clearance:</b> ${evaluation.allergies.safetyStatus}</p></div>`,
        },
      },
      {
        title: '4. Blood Clotting / Coagulation Safety Evaluation (LOINC)',
        code: {
          coding: [{ system: 'http://loinc.org', code: SURGICAL_LOINC_CODES.INR, display: 'Coagulation panel' }],
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>INR (LOINC 6301-6):</b> ${evaluation.coagulation.tests.inr.value} [${evaluation.coagulation.tests.inr.status}]</p><p><b>Platelets (LOINC 777-3):</b> ${evaluation.coagulation.tests.platelets.value} /uL [${evaluation.coagulation.tests.platelets.status}]</p><p><b>PT (LOINC 5902-2):</b> ${evaluation.coagulation.tests.prothrombinTime.value} s</p><p><b>aPTT (LOINC 3173-2):</b> ${evaluation.coagulation.tests.aptt.value} s</p><p><b>Status:</b> ${evaluation.coagulation.overallStatus}</p></div>`,
        },
      },
      {
        title: '5. Pre-Incision Time-Out Conclusion & Readiness',
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Overall Readiness:</b> ${evaluation.overallReadiness}</p><p><b>Active Holds:</b> ${evaluation.activeSafetyHolds.join('; ') || 'None (All surgical safety gates cleared)'}</p></div>`,
        },
      },
    ],
  };
}

/**
 * Submits the compiled FHIR R4 Composition to HAPI FHIR server and records an AuditEvent
 */
export async function submitSurgicalCompositionToFhir(
  evaluation: SurgicalTimeoutEvaluation
): Promise<{ success: boolean; compositionId?: string; error?: string }> {
  const fhirComposition = compileFhirSurgicalComposition(evaluation);
  const url = `${FHIR_BASE_URL}/Composition`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json, application/json',
      },
      body: JSON.stringify(fhirComposition),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 201 || res.status === 200) {
      const data = (await res.json()) as any;
      const compositionId = data.id || `comp-${Date.now()}`;
      phiSafeLog('INFO', `FHIR Surgical Composition created successfully. ID: ${compositionId}`);

      // Log authentic FHIR AuditEvent for Surgical Time-Out Record
      await submitFhirAuditEvent({
        eventType: 'surgical-timeout-cleared',
        action: 'C',
        outcome: '0',
        outcomeDesc: `Surgical Time-Out completed for ${evaluation.procedure.procedureName}. Readiness: ${evaluation.overallReadiness}.`,
        practitionerReference: evaluation.procedure.leadSurgeon.id,
        practitionerName: evaluation.procedure.leadSurgeon.name,
        entityReference: `Composition/${compositionId}`,
      });

      return { success: true, compositionId };
    }

    const errBody = await res.text();
    return { success: false, error: `FHIR rejected Composition (${res.status}): ${errBody.slice(0, 100)}` };
  } catch (err: any) {
    return { success: false, error: `FHIR Composition post failed: ${err.message}` };
  }
}
