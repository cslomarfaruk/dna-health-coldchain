import React from 'react';
import {
  Check,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowLeft,
  Code,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Step5HipaaComplianceProps } from '../types';

export const Step5HipaaCompliance: React.FC<Step5HipaaComplianceProps> = ({
  isAllInfoView = false,
  hipaaReport,
  nurseAlert,
  fhirAuditEvent,
  isOrderDispatched,
  activeWorkflow,
  activeIndent,
  pharmacistName = 'Sarah Jenkins, PharmD',
  onBackToStep4,
  onBackToStep1,
  expandedJson,
  onToggleJson,
}) => {
  return (
    <div
      id="section-audit"
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
              backgroundColor: '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {isAllInfoView ? <Check size={12} strokeWidth={3} /> : '5'}
          </span>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              HIPAA Compliance &amp; Audit &middot; Safe Harbor &amp; AuditEvent
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Requirement 5: Scrub all 18 direct identifiers and record immutable FHIR AuditEvent
            </div>
          </div>
        </div>
        <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
          <ShieldCheck size={11} /> {isAllInfoView ? 'Audit Logged & Safe Harbor Certified' : '100% Safe Harbor Compliant'}
        </span>
      </div>

      {/* Status Banner */}
      {isOrderDispatched ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
            fontSize: '0.75rem',
            color: '#166534',
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
          <div>
            <strong>Order Successfully Dispatched &amp; Recorded:</strong> The FHIR MedicationDispense has been committed to the EHR and a privacy-safe courier notification has been sent.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
            fontSize: '0.75rem',
            color: '#1e40af',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <strong>Order Pending Approval:</strong> This order has not been dispatched yet. Return to Step 4 to authorize and dispatch.
            </div>
          </div>
          {onBackToStep4 && (
            <button
              onClick={onBackToStep4}
              className="btn btn-primary"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', height: 'auto', gap: '0.25rem' }}
            >
              <span>Go to Step 4</span>
              <ArrowLeft size={11} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>
      )}

      {/* Safe Harbor Scrubbing Report */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
          De-Identification Engine Scrubbed Identifiers:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem' }}>
          {hipaaReport.scrubbedIdentifiers.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '0.45rem 0.6rem',
                fontSize: '0.72rem',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.66rem' }}>{item.identifierType}</div>
              <div style={{ fontWeight: 600, color: '#166534', marginTop: '0.15rem' }}>
                {item.actionTaken}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy-Safe Outbound Alert Preview */}
      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          marginBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>
            Outbound Nurse Push Alert
          </span>
          <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
            Safe for Display
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '4px',
            padding: '0.6rem 0.75rem',
            fontSize: '0.76rem',
            color: '#1e293b',
            fontStyle: 'italic',
          }}
        >
          &ldquo;Medication request #{activeWorkflow?.workflowNumber || activeWorkflow?.id || activeIndent?.indentNumber || 'WF-2026-9042'} is packaged for delivery. Drop zone: {nurseAlert.destinationDropZone || 'Ward 4B - Med Fridge Lockbox A'}. ETA: 10 mins.&rdquo;
        </div>
        <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '0.35rem' }}>
          &bull; Contains zero patient names, MRNs, or clinical diagnoses per 45 CFR &sect; 164.514(b).
        </div>
      </div>

      {/* FHIR AuditEvent Ledger Digest */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
            Immutable Compliance Ledger &middot; FHIR AuditEvent
          </span>
          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
            Recorded
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
          SHA-256 Digest: <span style={{ fontFamily: 'monospace', color: 'var(--clinical-blue)' }}>{hipaaReport.sha256AuditDigest.slice(0, 32)}...</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
          Recorded by: <strong>{pharmacistName}</strong> &middot; Outcome: <strong>Success (Code 0)</strong>
        </div>
      </div>

      {/* Raw FHIR AuditEvent JSON Toggle */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
        <button
          onClick={() => onToggleJson('fhirAudit')}
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
          <span>{expandedJson['fhirAudit'] ? 'Hide Raw FHIR Resource' : 'Inspect Raw FHIR AuditEvent JSON'}</span>
          {expandedJson['fhirAudit'] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expandedJson['fhirAudit'] && (
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
            {JSON.stringify(fhirAuditEvent, null, 2)}
          </pre>
        )}
      </div>

      {/* Step Navigation Footer */}
      {!isAllInfoView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          {onBackToStep4 && (
            <button
              type="button"
              onClick={onBackToStep4}
              className="btn btn-outline"
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
            >
              <ArrowLeft size={13} />
              <span>Previous: Dispatch Details (Step 4)</span>
            </button>
          )}
          {onBackToStep1 && (
            <button
              type="button"
              onClick={onBackToStep1}
              className="btn btn-outline"
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.85rem', gap: '0.35rem' }}
            >
              <span>Review Prescription (Step 1)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
