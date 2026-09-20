import React, { useState } from 'react';
import { ShieldCheck, Smartphone, ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { DeIdentifiedNurseAlert, HipaaSanitizationReport, Omp09ParsedOrder } from '../types/clinical';

interface HipaaGuardCardProps {
  parsedOrder: Omp09ParsedOrder;
  nurseAlert: DeIdentifiedNurseAlert;
  hipaaReport: HipaaSanitizationReport;
  onBack: () => void;
  onProceedToFhir: () => void;
}

export const HipaaGuardCard: React.FC<HipaaGuardCardProps> = ({
  parsedOrder,
  nurseAlert,
  hipaaReport,
  onBack,
  onProceedToFhir,
}) => {
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  return (
    <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Nurse Notification
            </h2>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
              <ShieldCheck size={11} />
              Privacy Protected
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            Alert sent to inpatient floor nurse mobile device with patient-identifying data de-identified
          </p>
        </div>

        <button
          onClick={() => setShowAuditDetails(!showAuditDetails)}
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
        >
          <span>{showAuditDetails ? 'Hide Privacy Report' : 'View Privacy Verification'}</span>
          {showAuditDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Main Focus: Clean Hospital Mobile Notification Card (Light Mode) */}
      <div style={{
        maxWidth: '560px',
        margin: '0 auto 1.25rem auto',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
        border: '1px solid #cbd5e1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700, color: '#0284c7' }}>
            <Smartphone size={16} />
            <span>Ward 4B Inpatient Desk Alert</span>
          </div>
          <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
            <CheckCircle2 size={11} />
            No Patient PHI
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Order Reference:</span>
            <strong style={{ color: '#0284c7', fontFamily: 'var(--font-mono)' }}>{nurseAlert.tokenizedOrderRef}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Delivery Destination:</span>
            <strong style={{ color: '#0f172a' }}>{nurseAlert.destinationDropZone}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Classification:</span>
            <span style={{ color: '#047857', fontWeight: 600 }}>{nurseAlert.medicationClassification}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Assigned Courier:</span>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>{nurseAlert.courierIdentifier}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Estimated Arrival:</span>
            <strong style={{ color: '#b45309' }}>In {nurseAlert.estimatedMinutesAway} mins ({nurseAlert.estimatedArrivalTimestamp})</strong>
          </div>

          <div style={{
            marginTop: '0.35rem',
            padding: '0.75rem 0.85rem',
            backgroundColor: '#f0fdf4',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #bbf7d0',
            fontSize: '0.76rem',
            lineHeight: 1.45,
            color: '#166534'
          }}>
            <strong>Handling Instructions:</strong> {nurseAlert.specialHandlingInstructions}
          </div>
        </div>
      </div>

      {/* Privacy Verification Drawer */}
      {showAuditDetails && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            Privacy Verification Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {hipaaReport.scrubbedIdentifiers.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#475569' }}>{item.identifierType}</span>
                <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>De-Identified</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        <button onClick={onProceedToFhir} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem' }}>
          <span>Next: Update Chart</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
