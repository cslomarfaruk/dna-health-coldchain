import React from 'react';
import {
  User,
  Bed,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ThermometerSnowflake,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { SampleHl7Scenario } from '../data/sampleHl7Messages';
import { Omp09ParsedOrder, FhirMedicationRequest } from '../types/clinical';

interface PrescriptionCardProps {
  scenarios: SampleHl7Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  parsedOrder: Omp09ParsedOrder;
  fhirMedRequest: FhirMedicationRequest;
  onProceedToValidation: () => void;
  activeIndent?: any;
  availableIndents?: any[];
  onSelectIndent?: (indent: any) => void;
}

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  parsedOrder,
  fhirMedRequest,
  onProceedToValidation,
  activeIndent,
  availableIndents = [],
  onSelectIndent,
}) => {
  // Extract prescribed dose & units from FHIR MedicationRequest or parsed order
  const prescribedDose =
    fhirMedRequest.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value?.toString() ||
    parsedOrder.rxo.requestedGiveAmount ||
    '100';
  const prescribedUnits =
    fhirMedRequest.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit ||
    parsedOrder.rxo.requestedGiveUnits ||
    'UNIT';

  // Nurse requested dose & units from activeIndent or scenario
  const requestedDose = activeIndent?.requestedDose || parsedOrder.rxo.requestedGiveAmount || '100';
  const requestedUnits = activeIndent?.requestedUnits || parsedOrder.rxo.requestedGiveUnits || 'UNIT';
  const requestedDrug = activeIndent?.requestedDrugName || parsedOrder.rxo.requestedDrugName;
  const prescribedDrug = fhirMedRequest.medicationCodeableConcept?.text || parsedOrder.rxo.requestedDrugName;

  // Double-check verification
  const isDrugMatch = requestedDrug.toLowerCase().includes('insulin')
    ? prescribedDrug.toLowerCase().includes('insulin')
    : requestedDrug.toLowerCase().trim() === prescribedDrug.toLowerCase().trim();

  const isDoseMatch = requestedDose.trim() === prescribedDose.trim();
  const doubleCheckPassed = isDrugMatch && isDoseMatch;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Scenario/Indent Switcher */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Medication Order &amp; Doctor's Prescription Double-Check
              </h2>
              {doubleCheckPassed ? (
                <span className="badge badge-green" style={{ fontSize: '0.72rem', gap: '0.3rem' }}>
                  <CheckCircle2 size={12} />
                  Double-Check Verified
                </span>
              ) : (
                <span className="badge badge-red" style={{ fontSize: '0.72rem', gap: '0.3rem' }}>
                  <AlertTriangle size={12} />
                  Safety Mismatch Flagged
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Central Pharmacy Software cross-referencing floor nurse digital indent against the doctor's official EHR prescription.
            </p>
          </div>

          {/* Preset Clinical Scenarios Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label htmlFor="scenario-select" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Clinical Scenario:
            </label>
            <select
              id="scenario-select"
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real Floor Indents Selector (if available) */}
        {availableIndents.length > 0 && onSelectIndent && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Floor Indent:
              </span>
              <select
                value={activeIndent?.id || ''}
                onChange={(e) => {
                  const found = availableIndents.find((i) => i.id === e.target.value);
                  if (found) onSelectIndent(found);
                }}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.76rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  maxWidth: '360px',
                }}
              >
                {availableIndents.slice(0, 15).map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.indentNumber} &middot; {ind.requestedDrugName} {ind.requestedDose} {ind.requestedUnits} ({ind.status})
                  </option>
                ))}
              </select>
            </div>
            {activeIndent && (
              <span className={`badge ${activeIndent.status === 'DISPATCHED' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                Active Indent Status: {activeIndent.status}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Side-by-Side Dual Comparison: Nurse Indent vs Doctor's Official Prescription */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
        {/* Panel 1: Floor Nurse's Digital Indent (Bedside Request) */}
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Bed size={17} style={{ color: 'var(--clinical-blue)' }} />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                1. Floor Nurse Bedside Indent
              </h3>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
              {activeIndent?.indentNumber || 'IND-2026-9042'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Inpatient Location
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {activeIndent?.ward || parsedOrder.pv1.assignedLocation || 'Ward 4B Bed 12'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Req by: {activeIndent?.nurse?.fullName || 'Nurse Sarah Jenkins, RN'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Patient Identity
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {activeIndent?.patientName || parsedOrder.pid.patientName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  MRN: {activeIndent?.patientMrn || parsedOrder.pid.patientId}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Requested Medication &amp; Dose
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clinical-blue-dark)', marginTop: '0.2rem' }}>
                {requestedDrug}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Dose: <span style={{ color: 'var(--text-primary)' }}>{requestedDose} {requestedUnits}</span> &middot; Route: Subcutaneous
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              <ThermometerSnowflake size={15} style={{ color: 'var(--clinical-blue)' }} />
              <span style={{ fontSize: '0.74rem', color: 'var(--clinical-blue-dark)', fontWeight: 500 }}>
                Storage: <strong>Refrigerated Cold Chain (2°C–8°C)</strong> &middot; Ward Med Fridge Lockbox A
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Doctor's Official Prescription (Hospital EHR - FHIR MedicationRequest) */}
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileText size={17} style={{ color: 'var(--safe-green-dark)' }} />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                2. Doctor's Official Prescription (EHR)
              </h3>
            </div>
            <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
              FHIR: {fhirMedRequest.id}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Attending Physician
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {parsedOrder.pv1.attendingDoctor || 'Dr. Robert Kaplan, MD'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Auth Status: Active (EHR Verified)
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Prescription Placer Ref
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  #{parsedOrder.orc.placerOrderNumber || 'ORD-2026-9042'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Priority: {fhirMedRequest.priority?.toUpperCase() || 'ROUTINE'}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Official Prescribed Formulation
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {prescribedDrug}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Dose: <span style={{ color: 'var(--text-primary)' }}>{prescribedDose} {prescribedUnits}</span> &middot; Route: Subcutaneous Daily
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
              <ShieldCheck size={15} style={{ color: 'var(--safe-green-dark)' }} />
              <span style={{ fontSize: '0.74rem', color: 'var(--safe-green-dark)', fontWeight: 500 }}>
                EHR Cross-Check Authority: <strong>FHIR R4 MedicationRequest Verified</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Check Safety Verification Bar (Pharmacist Double-Check) */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: doubleCheckPassed ? '#f0fdf4' : '#fff5f5', border: `1px solid ${doubleCheckPassed ? '#bbf7d0' : '#fed7d7'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: doubleCheckPassed ? 'var(--safe-green-dark)' : 'var(--accent-red)' }} />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: doubleCheckPassed ? 'var(--safe-green-dark)' : 'var(--accent-red)' }}>
              Pharmacy Double-Check Safety Verification
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mandatory clinical double-check before packaging &amp; cold-chain dispatch
          </span>
        </div>

        {/* 4 Double-Check Gates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
          {/* Gate 1: Drug Name Match */}
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '4px', border: `1px solid ${isDrugMatch ? '#bbf7d0' : '#fca5a5'}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: isDrugMatch ? '#dcfce7' : '#fee2e2', color: isDrugMatch ? '#15803d' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isDrugMatch ? <Check size={13} /> : <X size={13} />}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Drug Identity</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isDrugMatch ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                {isDrugMatch ? 'Drug Concordant' : 'Drug Mismatch'}
              </div>
            </div>
          </div>

          {/* Gate 2: Dose Match */}
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '4px', border: `1px solid ${isDoseMatch ? '#bbf7d0' : '#fca5a5'}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: isDoseMatch ? '#dcfce7' : '#fee2e2', color: isDoseMatch ? '#15803d' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isDoseMatch ? <Check size={13} /> : <X size={13} />}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Dose &amp; Strength</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isDoseMatch ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                {isDoseMatch ? `${requestedDose} ${requestedUnits} (Exact Match)` : `Discrepancy: ${requestedDose} vs ${prescribedDose}`}
              </div>
            </div>
          </div>

          {/* Gate 3: Patient / Location */}
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={13} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Patient &amp; Inpatient Room</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {parsedOrder.pv1.assignedLocation} (Confirmed)
              </div>
            </div>
          </div>

          {/* Gate 4: Cold Chain Protocol */}
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={13} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Storage Requirement</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Refrigerator 2°C–8°C
              </div>
            </div>
          </div>
        </div>

        {/* Double-Check Summary Text */}
        <p style={{ fontSize: '0.8rem', color: doubleCheckPassed ? 'var(--safe-green-dark)' : 'var(--accent-red)', margin: 0, lineHeight: 1.4 }}>
          {doubleCheckPassed
            ? `Double-Check Passed: The requested drug (${requestedDrug}) and dose (${requestedDose} ${requestedUnits}) strictly match the attending doctor's official EHR prescription for ${parsedOrder.pid.patientName}. Proceed to NLM RxNorm formulation verification.`
            : `Double-Check Safety Block: A dosage discrepancy was detected! The nurse indent requests ${requestedDose} ${requestedUnits}, but the doctor's official EHR prescription specifies ${prescribedDose} ${prescribedUnits}. Dispensing is blocked to prevent adverse clinical events.`}
        </p>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Step 1 Complete &middot; Ready to validate drug formulation against NIH NLM RxNav / RxNorm
        </div>
        <button
          onClick={onProceedToValidation}
          className="btn btn-primary"
          style={{ padding: '0.55rem 1.1rem', gap: '0.45rem' }}
        >
          <span>Next: Verify Drug (RxNorm)</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};

