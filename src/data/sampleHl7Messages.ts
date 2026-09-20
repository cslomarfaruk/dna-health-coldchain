/**
 * Sample Hospital HL7 v2 OMP^O09 Messages
 * Realistic clinical inpatient orders formatted per HL7 v2.5 standards
 */

export interface SampleHl7Scenario {
  id: string;
  title: string;
  drugName: string;
  dosage: string;
  ward: string;
  priority: 'ROUTINE' | 'STAT' | 'URGENT';
  coldChainRequired: boolean;
  rawMessage: string;
}

export const SAMPLE_HL7_SCENARIOS: SampleHl7Scenario[] = [
  {
    id: 'SCENARIO-INSULIN',
    title: 'Standard Cold-Chain: Insulin Glargine (Ward 4B Bed 12)',
    drugName: 'Insulin Glargine',
    dosage: '100 UNT/ML Subcutaneous',
    ward: 'Ward 4B (Inpatient Medical/Surg)',
    priority: 'ROUTINE',
    coldChainRequired: true,
    rawMessage: [
      'MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG20260916001|P|2.5',
      'PID|1||MRN-849201^^^ST_JUDE^MR||WARREN^ELIZABETH^M||19780624|F|||124 PARK AVE^^NEW YORK^NY^10016||(212)555-0199',
      'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT^M^^DR|||IPD||||||||ADM-90214',
      'ORC|NW|ORD-2026-9042|FIL-88192||CM||1^BID^20260916093000||20260916093000|10842^KAPLAN^ROBERT|||PHARMACY',
      'RXO|274783^INSULIN GLARGINE 100 UNIT/ML^RXNORM|100|UNIT||||||||SC',
      'RXR|SC^SUBCUTANEOUS^HL70162'
    ].join('\r') + '\r'
  },
  {
    id: 'SCENARIO-TRASTUZUMAB',
    title: 'STAT Oncology Cold-Chain: Trastuzumab (Oncology Floor 7C)',
    drugName: 'Trastuzumab',
    dosage: '420 MG IV Infusion',
    ward: 'Ward 7C (Oncology Inpatient)',
    priority: 'STAT',
    coldChainRequired: true,
    rawMessage: [
      'MSH|^~\\&|CERNER_EHR|MEMORIAL_SLOAN|PHARM_DISPENSE|CENTRAL_PHARM|20260916101500||OMP^O09|MSG20260916002|P|2.5',
      'PID|1||MRN-392019^^^MEMORIAL^MR||PATEL^ANANYA^S||19650218|F|||450 1ST AVE^^NEW YORK^NY^10016||(646)555-0128',
      'PV1|1|I|WARD-7C^BED-03^07||||11499^CHEN^LISA^Y^^DR|||IPD||||||||ADM-90455',
      'ORC|NW|ORD-2026-9043|FIL-88193||CM||1^STAT^20260916101500||20260916101500|11499^CHEN^LISA|||PHARMACY',
      'RXO|228833^TRASTUZUMAB 420 MG^RXNORM|420|MG||||||||IV',
      'RXR|IV^INTRAVENOUS^HL70162'
    ].join('\r') + '\r'
  },
  {
    id: 'SCENARIO-FILGRASTIM',
    title: 'Urgent Cold-Chain: Filgrastim (BMT Ward 5A Bed 08)',
    drugName: 'Filgrastim',
    dosage: '300 MCG/ML Subcutaneous',
    ward: 'Ward 5A (Bone Marrow Transplant)',
    priority: 'URGENT',
    coldChainRequired: true,
    rawMessage: [
      'MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916110000||OMP^O09|MSG20260916003|P|2.5',
      'PID|1||MRN-720194^^^ST_JUDE^MR||O_CONNOR^LIAM^P||19911105|M|||82 LINCOLN BLVD^^NEW YORK^NY^10023||(212)555-0812',
      'PV1|1|I|WARD-5A^BED-08^05||||10512^VAZQUEZ^MARIA^G^^DR|||IPD||||||||ADM-90612',
      'ORC|NW|ORD-2026-9044|FIL-88194||CM||1^DAILY^20260916110000||20260916110000|10512^VAZQUEZ^MARIA|||PHARMACY',
      'RXO|214557^FILGRASTIM 300 MCG/ML^RXNORM|300|MCG||||||||SC',
      'RXR|SC^SUBCUTANEOUS^HL70162'
    ].join('\r') + '\r'
  },
  {
    id: 'SCENARIO-AMOXICILLIN',
    title: 'Ambient Comparison: Amoxicillin 500mg Oral (Ward 3B)',
    drugName: 'Amoxicillin',
    dosage: '500 MG Oral Capsule',
    ward: 'Ward 3B (General Medicine)',
    priority: 'ROUTINE',
    coldChainRequired: false,
    rawMessage: [
      'MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916113000||OMP^O09|MSG20260916004|P|2.5',
      'PID|1||MRN-551920^^^ST_JUDE^MR||MILLER^DAVID^R||19540819|M|||77 BLEECKER ST^^NEW YORK^NY^10012||(212)555-0943',
      'PV1|1|I|WARD-3B^BED-22^03||||10842^KAPLAN^ROBERT^M^^DR|||IPD||||||||ADM-90801',
      'ORC|NW|ORD-2026-9045|FIL-88195||CM||1^TID^20260916113000||20260916113000|10842^KAPLAN^ROBERT|||PHARMACY',
      'RXO|723^AMOXICILLIN 500 MG^RXNORM|500|MG||||||||PO',
      'RXR|PO^ORAL^HL70162'
    ].join('\r') + '\r'
  },
  {
    id: 'SCENARIO-DOSE-MISMATCH',
    title: 'Safety Test: Insulin Glargine Overdose (999 UNT - Dose Mismatch)',
    drugName: 'Insulin Glargine',
    dosage: '999 UNT/ML Subcutaneous',
    ward: 'Ward 4B (Inpatient Medical/Surg)',
    priority: 'STAT',
    coldChainRequired: true,
    rawMessage: [
      'MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG20260916999|P|2.5',
      'PID|1||MRN-849201^^^ST_JUDE^MR||WARREN^ELIZABETH^M||19780624|F',
      'PV1|1|I|WARD-4B^BED-12^04||||10842^KAPLAN^ROBERT^M^^DR|||IPD',
      'ORC|NW|ORD-2026-9042|FIL-88192||CM||1^BID^20260916093000||20260916093000|10842^KAPLAN^ROBERT|||PHARMACY',
      'RXO|274783^INSULIN GLARGINE 999 UNIT/ML^RXNORM|999|UNIT||||||||SC',
      'RXR|SC^SUBCUTANEOUS^HL70162'
    ].join('\r') + '\r'
  },
  {
    id: 'SCENARIO-INVALID-HL7',
    title: 'Format Test: Malformed Non-OMP Feed (ADT^A01 - Rejected)',
    drugName: 'Unknown',
    dosage: 'N/A',
    ward: 'Ward 4B',
    priority: 'ROUTINE',
    coldChainRequired: false,
    rawMessage: [
      'MSH|^~\\&|ADT_SYSTEM|ST_JUDE_HOSPITAL|CENTRAL_PHARM|HOSPITAL|20260916093000||ADT^A01|MSG20260916888|P|2.5',
      'PID|1||MRN-849201||WARREN^ELIZABETH',
      'PV1|1|I|WARD-4B'
    ].join('\r') + '\r'
  }
];
