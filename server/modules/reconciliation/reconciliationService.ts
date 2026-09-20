import { NormalizedFhirMedicationRequest } from '../fhir/fhirClient';
import { ParsedHl7Omp09 } from '../hl7/hl7Service';
import { ValidatedDrugInfo } from '../rxnorm/rxnormService';

export interface ReconciliationEvaluation {
  overallStatus: 'PASSED' | 'FAILED' | 'INCOMPLETE';
  patientMatch: boolean;
  medicationMatch: boolean;
  formulationMatch: boolean;
  strengthMatch: boolean;
  doseMatch: boolean;
  routeMatch: boolean;
  discrepancies: string[];
  summary: string;
}

export interface IndentReconciliationInput {
  patientMrn: string;
  patientName?: string;
  requestedDrugName: string;
  requestedDose: string;
  requestedUnits: string;
  formulation?: string | null;
  route?: string | null;
}

function normalizePatientMrn(mrn: string): string {
  return (mrn || '')
    .toUpperCase()
    .replace(/^PATIENT\//i, '')
    .replace(/^MRN[-_:]?/i, '')
    .replace(/\^.+$/, '') // strip HL7 authority components
    .trim();
}

function normalizeDrugName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\b(inj|solution|injectable|vial|pen)\b/gi, '')
    .trim();
}

function normalizeUnits(unit: string): string {
  const u = (unit || '').toUpperCase().trim();
  if (u === 'UNT' || u === 'UNIT' || u === 'UNITS' || u === 'U') return 'UNIT';
  if (u === 'MG' || u === 'MILLIGRAM') return 'MG';
  if (u === 'ML' || u === 'MILLILITER') return 'ML';
  return u;
}

function normalizeRoute(route: string): string {
  const r = (route || '').toUpperCase().trim();
  if (r.includes('SUBCUT') || r === 'SC' || r === 'SQ') return 'SUBCUTANEOUS';
  if (r.includes('INTRAVEN') || r === 'IV') return 'INTRAVENOUS';
  if (r.includes('ORAL') || r === 'PO') return 'ORAL';
  return r;
}

/**
 * Executes a deterministic 3-way medication reconciliation comparing:
 * Source A: Nurse Floor Medication Indent
 * Source B: FHIR R4 MedicationRequest
 * Source C: Parsed HL7 v2 OMP^O09 Order
 */
export function evaluateThreeWayReconciliation(
  indent: IndentReconciliationInput,
  fhir: NormalizedFhirMedicationRequest,
  hl7: ParsedHl7Omp09,
  rxnorm?: ValidatedDrugInfo
): ReconciliationEvaluation {
  const discrepancies: string[] = [];

  // 1. Patient Identity Match
  const indentMrn = normalizePatientMrn(indent.patientMrn);
  const fhirMrn = normalizePatientMrn(fhir.patientReference);
  const hl7Mrn = normalizePatientMrn(hl7.pid.patientId);

  const patientMatch = indentMrn === fhirMrn && fhirMrn === hl7Mrn && indentMrn.length > 0;
  if (!patientMatch) {
    discrepancies.push(
      `Patient MRN Mismatch: Indent [${indentMrn || 'EMPTY'}] vs FHIR [${fhirMrn || 'EMPTY'}] vs HL7 [${hl7Mrn || 'EMPTY'}]`
    );
  }

  // 2. Medication Identity Match
  const indentDrug = normalizeDrugName(indent.requestedDrugName);
  const fhirDrug = normalizeDrugName(fhir.medicationName);
  const hl7Drug = normalizeDrugName(hl7.rxo.drugName);

  // Check name similarity or common keyword
  const drugNamesMatch =
    (indentDrug.includes(fhirDrug) || fhirDrug.includes(indentDrug)) &&
    (hl7Drug.includes(indentDrug) || indentDrug.includes(hl7Drug));

  // Check RxNorm RxCUI if available
  let rxcuiMatch = true;
  if (fhir.rxNormCode && rxnorm?.rxcui) {
    rxcuiMatch = fhir.rxNormCode === rxnorm.rxcui;
    if (!rxcuiMatch) {
      discrepancies.push(
        `RxNorm RxCUI Mismatch: FHIR specifies RxCUI ${fhir.rxNormCode} but verified RxNorm concept is ${rxnorm.rxcui}`
      );
    }
  }

  const medicationMatch = drugNamesMatch && rxcuiMatch;
  if (!drugNamesMatch) {
    discrepancies.push(
      `Medication Name Discrepancy: Indent ["${indent.requestedDrugName}"] vs FHIR ["${fhir.medicationName}"] vs HL7 ["${hl7.rxo.drugName}"]`
    );
  }

  // 3. Dose & Quantity Match
  const indentDoseNum = parseFloat(indent.requestedDose);
  const hl7DoseNum = parseFloat(hl7.rxo.giveAmount);
  const fhirDoseNum = fhir.dosageValue;

  const indentUnits = normalizeUnits(indent.requestedUnits);
  const hl7Units = normalizeUnits(hl7.rxo.giveUnits);
  const fhirUnits = normalizeUnits(fhir.dosageUnit);

  const doseValuesMatch = indentDoseNum === fhirDoseNum && fhirDoseNum === hl7DoseNum && !isNaN(indentDoseNum);
  const doseUnitsMatch = indentUnits === fhirUnits && fhirUnits === hl7Units && indentUnits.length > 0;
  const doseMatch = doseValuesMatch && doseUnitsMatch;

  if (!doseMatch) {
    discrepancies.push(
      `Dose / Quantity Discrepancy: Indent [${indent.requestedDose} ${indent.requestedUnits}] vs FHIR [${fhir.dosageValue} ${fhir.dosageUnit}] vs HL7 [${hl7.rxo.giveAmount} ${hl7.rxo.giveUnits}]`
    );
  }

  // 4. Formulation & Strength Match
  let formulationMatch = true;
  let strengthMatch = true;

  if (rxnorm) {
    if (rxnorm.validationStatus === 'NOT_FOUND') {
      formulationMatch = false;
      discrepancies.push(`Medication "${indent.requestedDrugName}" could not be registered in RxNorm terminology.`);
    } else if (rxnorm.validationStatus === 'RXNORM_UNAVAILABLE') {
      formulationMatch = false;
      discrepancies.push(`RxNorm service unavailable. Deterministic formulation check cannot be completed.`);
    } else if (rxnorm.formulationMatch.status === 'STRENGTH_MISMATCH') {
      strengthMatch = false;
      discrepancies.push(`Strength Mismatch: ${rxnorm.formulationMatch.clinicalSafetyNotes}`);
    } else if (rxnorm.formulationMatch.status === 'UNREGISTERED_FORMULATION') {
      formulationMatch = false;
      discrepancies.push(`Unregistered formulation: ${rxnorm.formulationMatch.clinicalSafetyNotes}`);
    }
  }

  // 5. Route Match
  const indentRoute = normalizeRoute(indent.route || 'Subcutaneous');
  const hl7Route = normalizeRoute(hl7.rxr.routeName || hl7.rxr.routeCode);
  const fhirRoute = normalizeRoute(fhir.routeName || fhir.routeCode || 'Subcutaneous');

  const routeMatch = indentRoute === fhirRoute && fhirRoute === hl7Route;
  if (!routeMatch) {
    discrepancies.push(
      `Route of Administration Discrepancy: Indent [${indent.route || 'N/A'}] vs FHIR [${fhir.routeName || 'N/A'}] vs HL7 [${hl7.rxr.routeName || 'N/A'}]`
    );
  }

  // Overall status evaluation
  let overallStatus: 'PASSED' | 'FAILED' | 'INCOMPLETE';

  if (!patientMatch || !medicationMatch || !doseMatch || !strengthMatch || !formulationMatch) {
    overallStatus = 'FAILED';
  } else if (!routeMatch) {
    overallStatus = 'FAILED';
  } else if (!indentMrn || !fhirMrn || !hl7Mrn) {
    overallStatus = 'INCOMPLETE';
  } else {
    overallStatus = 'PASSED';
  }

  const summary =
    overallStatus === 'PASSED'
      ? 'All clinical order attributes reconciled across Floor Indent, EHR FHIR prescription, and HL7 order feed.'
      : `Reconciliation FAILED with ${discrepancies.length} discrepancy: ${discrepancies.join('; ')}`;

  return {
    overallStatus,
    patientMatch,
    medicationMatch,
    formulationMatch,
    strengthMatch,
    doseMatch,
    routeMatch,
    discrepancies,
    summary,
  };
}
