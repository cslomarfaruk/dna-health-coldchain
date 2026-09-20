import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code2,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_HL7_SCENARIOS } from '../../data/sampleHl7Messages';

interface Hl7RejectionTestCardProps {
  backendError?: string | null;
  onResetScenario: (id: string) => void;
}

export const Hl7RejectionTestCard: React.FC<Hl7RejectionTestCardProps> = ({
  backendError,
  onResetScenario,
}) => {
  const [showRawHl7, setShowRawHl7] = useState(false);

  const rawMessage =
    SAMPLE_HL7_SCENARIOS.find((s) => s.id === 'SCENARIO-INVALID-HL7')?.rawMessage ||
    'MSH|^~\\&|ADT_SYSTEM|ST_JUDE_HOSPITAL|CENTRAL_PHARM|HOSPITAL|20260916093000||ADT^A01|MSG20260916888|P|2.5\rPID|1||MRN-849201||WARREN^ELIZABETH\rPV1|1|I|WARD-4B';

  return (
    <div
      id="hl7-rejection-test-card"
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #fed7aa',
        borderRadius: '8px',
        padding: '1.75rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ffedd5',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Inbound HL7 v2.5 Protocol Gate Active
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle2 size={11} /> TEST VERIFIED: FAIL-CLOSED PROTECTION
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Simulated Safety Test Preset &middot; <strong>Scenario D: Malformed Non-OMP Feed (ADT^A01 Rejected)</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onResetScenario('SCENARIO-INSULIN')}
          className="btn btn-primary"
          style={{
            fontSize: '0.78rem',
            padding: '0.45rem 0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span>Return to Valid Order (Insulin)</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Rejection Diagnostics Box */}
      <div
        style={{
          backgroundColor: '#fff7ed',
          border: '1px solid #ffedd5',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
          <AlertTriangle size={15} style={{ color: '#ea580c', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9a3412' }}>
            Message Intercepted &amp; Safely Rejected by Integration Engine
          </span>
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '0.76rem',
            color: '#7c2d12',
            backgroundColor: '#ffedd5',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid #fed7aa',
            wordBreak: 'break-word',
          }}
        >
          {backendError ||
            'HL7_MESSAGE_TYPE_REJECTED: Expected pharmacy order message type OMP^O09, but received "ADT^A01". Message rejected.'}
        </div>
      </div>

      {/* Protocol Explanation Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Inbound Feed (MSH-9)
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
            ADT^A01
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
            Patient Admission / Census Event (Non-Pharmacy)
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Required Specification
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>
            OMP^O09
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
            Inpatient Pharmacy Treatment Order
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Parser Action
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
            Fail-Closed Lock
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
            Zero database writes &middot; Pipeline locked
          </div>
        </div>
      </div>

      {/* Clinical Context Note */}
      <div
        style={{
          fontSize: '0.77rem',
          color: '#475569',
          lineHeight: 1.5,
          padding: '0.75rem',
          borderRadius: '6px',
          backgroundColor: '#f1f5f9',
          marginBottom: '1.25rem',
        }}
      >
        <strong>Why is this message rejected?</strong> In hospital interoperability, an Admission/Discharge/Transfer
        (<code>ADT</code>) message carries bed census and demographic updates, not signed clinical prescriptions.
        Allowing an <code>ADT^A01</code> message into a pharmacy dispensary pipeline would corrupt order numbering and bypass
        mandatory prescriber authorization. The parser correctly blocks this message before any order records or
        dispensation workflows can be created.
      </div>

      {/* Raw HL7 Message Toggle */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        <button
          type="button"
          onClick={() => setShowRawHl7((prev) => !prev)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.76rem',
            color: '#2563eb',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Code2 size={13} />
          <span>{showRawHl7 ? 'Hide Rejected HL7 Feed' : 'Inspect Raw Rejected HL7 v2.5 Message'}</span>
          {showRawHl7 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showRawHl7 && (
          <pre
            style={{
              marginTop: '0.65rem',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              fontSize: '0.72rem',
              lineHeight: 1.45,
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {rawMessage}
          </pre>
        )}
      </div>
    </div>
  );
};
