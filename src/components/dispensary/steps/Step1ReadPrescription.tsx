import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ThermometerSnowflake,
  Stethoscope,
  ArrowRight,
  Code,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Step1ReadPrescriptionProps } from '../types';

export const Step1ReadPrescription: React.FC<Step1ReadPrescriptionProps> = ({
  isAllInfoView = false,
  activeIndent,
  parsedOrder,
  fhirMedRequest,
  surgeryContext,
  prescribedDose,
  prescribedUnits,
  onAdvanceToStep2,
  expandedJson,
  onToggleJson,
}) => {
  const navigate = useNavigate();
  const prescribedDrug =
    fhirMedRequest.medicationCodeableConcept?.text || parsedOrder.rxo.requestedDrugName;
  const currentMrn = activeIndent?.patientMrn || parsedOrder.pid.patientId || 'MRN-849201';

  return (
    <div
      id="section-rx"
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '1.1rem 1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: isAllInfoView ? '#16a34a' : 'var(--clinical-blue)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {isAllInfoView ? <Check size={12} strokeWidth={3} /> : '1'}
          </span>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Read Prescription &middot; FHIR MedicationRequest
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Requirement 1: Read and parse doctor prescription from EHR
            </div>
          </div>
        </div>
        <span className={`badge ${isAllInfoView ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
          {isAllInfoView ? (
            <>
              <CheckCircle2 size={11} />
              <span>Rx Verified &middot; HL7 FHIR R4</span>
            </>
          ) : (
            <span>HL7 FHIR R4 &middot; MedicationRequest</span>
          )}
        </span>
      </div>

      {/* Patient Profile Card */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              color: 'var(--clinical-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                {activeIndent?.patientName || parsedOrder.pid.patientName || 'Warren, Elizabeth'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                (MRN: {activeIndent?.patientMrn || parsedOrder.pid.patientId || 'MRN-849201'})
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                }}
              >
                {activeIndent?.patientRoomBed || parsedOrder.pv1.assignedLocation || 'Ward 4B Bed 12'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem' }}>
              Doctor: <strong>{parsedOrder.orc.orderingProvider || 'Dr. Robert Kaplan, MD'}</strong> &middot; Order Ref: #{parsedOrder.orc.placerOrderNumber || 'ORD-2026-9042'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '5px',
            padding: '0.3rem 0.65rem',
          }}
        >
          <ThermometerSnowflake size={14} style={{ color: 'var(--clinical-blue)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e40af' }}>
            Requires 2&deg;C &ndash; 8&deg;C Cold Storage
          </span>
        </div>
      </div>

      {/* Prescribed Clinical Drug Details */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          backgroundColor: '#ffffff',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Prescribed Medication &amp; Dosage Instructions
        </div>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
          {prescribedDrug}
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.76rem', color: '#475569', flexWrap: 'wrap' }}>
          <div>Prescribed Dose: <strong>{prescribedDose} {prescribedUnits}</strong></div>
          <div>Route: <strong>{parsedOrder.rxr.routeName || 'Subcutaneous'} Daily</strong></div>
          <div>Target Drop Zone: <strong>{activeIndent?.patientRoomBed ? `${activeIndent.patientRoomBed} - Med Fridge` : 'Ward 4B - Med Fridge Lockbox A'}</strong></div>
        </div>
      </div>



      {/* Raw FHIR MedicationRequest JSON Toggle */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
        <button
          onClick={() => onToggleJson('fhirMedRequest')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--clinical-blue)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: 0,
          }}
        >
          <Code size={13} />
          <span>{expandedJson['fhirMedRequest'] ? 'Hide Raw FHIR Resource' : 'Inspect Raw FHIR MedicationRequest JSON'}</span>
          {expandedJson['fhirMedRequest'] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expandedJson['fhirMedRequest'] && (
          <pre
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '5px',
              padding: '0.65rem',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: '#1e293b',
              maxHeight: '180px',
              overflowY: 'auto',
              marginTop: '0.5rem',
              margin: '0.5rem 0 0 0',
            }}
          >
            {JSON.stringify(fhirMedRequest, null, 2)}
          </pre>
        )}
      </div>

      {/* Step Navigation Footer */}
      {!isAllInfoView && onAdvanceToStep2 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onAdvanceToStep2}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem', gap: '0.4rem', fontWeight: 600 }}
          >
            <span>Verify Prescription &amp; Proceed to Drug Validation (Step 2)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
