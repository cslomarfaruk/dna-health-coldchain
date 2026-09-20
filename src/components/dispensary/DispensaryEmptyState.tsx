import React from 'react';
import {
  Inbox,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  ThermometerSnowflake,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DispensaryEmptyStateProps } from './types';

export const DispensaryEmptyState: React.FC<DispensaryEmptyStateProps> = ({
  availableIndents,
  onSelectFirstPending,
  onSelectScenario,
}) => {
  const pendingIndents = availableIndents.filter((i) => i.status === 'PENDING');
  const dispatchedIndents = availableIndents.filter((i) => i.status === 'DISPATCHED');

  return (
    <div
      id="dispensary-empty-state"
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '2.25rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: 'var(--clinical-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          border: '1px solid #bfdbfe',
        }}
      >
        <Inbox size={28} />
      </div>

      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
        No Medication Request Selected
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
        Please select an active inpatient prescription from the <strong>Medication Queue</strong> on the left, or pick a clinical scenario preset. Once selected, prescription details will load and <strong>Step 1</strong> will activate.
      </p>

      {/* Quick Queue Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
          width: '100%',
          maxWidth: '580px',
          marginBottom: '1.75rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>
            <Clock size={14} />
            <span>Awaiting Fulfillment</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#78350f', marginTop: '0.2rem' }}>
            {pendingIndents.length} Pending
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065f46', fontSize: '0.72rem', fontWeight: 700 }}>
            <FileCheck size={14} />
            <span>Dispatched &amp; In-Transit</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064e3b', marginTop: '0.2rem' }}>
            {dispatchedIndents.length} Dispatched
          </div>
        </div>
      </div>

      {/* Clinical 5-Step Overview Pills */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          width: '100%',
          maxWidth: '580px',
          textAlign: 'left',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.5rem' }}>
          Sequential Verification Pipeline Guide:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.74rem', color: '#334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>1</span>
            <span><strong>Read Prescription:</strong> Parse doctor order from EHR (FHIR MedicationRequest)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>2</span>
            <span><strong>Validate Drug:</strong> Match formulation against NIH NLM RxNorm database</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>3</span>
            <span><strong>Process Delivery:</strong> Enforce 3-way concordance (Doctor Rx vs Nurse Indent vs Formulary)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>4</span>
            <span><strong>Approve &amp; Dispatch:</strong> Verify 2&deg;C&ndash;8&deg;C cold-chain storage and authorize transport</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>5</span>
            <span><strong>HIPAA Compliance:</strong> Safe Harbor 18-identifier scrub &amp; tamper-evident AuditEvent</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {pendingIndents.length > 0 && (
          <button
            type="button"
            id="btn-quick-start-pending"
            data-testid="quick-start-pending"
            onClick={onSelectFirstPending}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', gap: '0.4rem', fontWeight: 700 }}
          >
            <span>Review Next Pending Order (#{pendingIndents[0].indentNumber})</span>
            <ArrowRight size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectScenario('SCENARIO-INSULIN')}
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', gap: '0.4rem', fontWeight: 600 }}
        >
          <Sparkles size={14} style={{ color: 'var(--clinical-blue)' }} />
          <span>Load Standard Insulin Scenario</span>
        </button>
      </div>
    </div>
  );
};
