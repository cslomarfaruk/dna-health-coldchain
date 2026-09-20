import React from 'react';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  Code,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Step3ProcessDeliveryProps } from '../types';

export const Step3ProcessDelivery: React.FC<Step3ProcessDeliveryProps> = ({
  isAllInfoView = false,
  parsedOrder,
  activeIndent,
  fhirMedRequest,
  concordancePassed,
  requestedDrug,
  requestedDose,
  requestedUnits,
  prescribedDrug,
  prescribedDose,
  prescribedUnits,
  orderKey,
  reconciliation,
  onAdvanceToStep4,
  onBackToStep2,
  expandedJson,
  onToggleJson,
}) => {
  const isDoseMatch =
    requestedDose === prescribedDose ||
    Math.abs(parseFloat(requestedDose || '0') - parseFloat(prescribedDose || '0')) < 0.001;

  return (
    <div
      id="section-concordance"
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${concordancePassed ? '#e2e8f0' : '#fed7d7'}`,
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
              backgroundColor: isAllInfoView ? '#16a34a' : concordancePassed ? 'var(--clinical-blue)' : '#dc2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {isAllInfoView ? <Check size={12} strokeWidth={3} /> : '3'}
          </span>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Process Delivery &middot; HL7 v2 OMP^O09 &amp; 3-Way Concordance
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Requirement 3: Parse hospital order message and verify 3-way concordance
            </div>
          </div>
        </div>
        {concordancePassed ? (
          <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
            <CheckCircle2 size={11} /> {isAllInfoView ? '3-Way Concordance Passed' : '3-Way Verified'}
          </span>
        ) : (
          <span className="badge badge-red" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
            <AlertTriangle size={11} /> Safety Hold Engaged
          </span>
        )}
      </div>

      {/* 3 Columns Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        {/* 1. Nurse Bedside Indent */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155' }}>
              1. Nurse Bedside Indent
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Floor Request</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
            {requestedDrug}
          </div>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: !isDoseMatch ? '#dc2626' : '#1e293b',
              backgroundColor: !isDoseMatch ? '#fee2e2' : 'transparent',
              padding: !isDoseMatch ? '0.1rem 0.35rem' : 0,
              borderRadius: '3px',
              display: 'inline-block',
            }}
          >
            Dose: {requestedDose} {requestedUnits}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Route: {activeIndent?.route || parsedOrder.rxr.routeName || 'Subcutaneous'}
          </div>
        </div>

        {/* 2. Doctor EHR Prescription */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155' }}>
              2. Doctor EHR Prescription
            </span>
            <span style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 600 }}>FHIR R4</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
            {prescribedDrug}
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e293b' }}>
            Dose: {prescribedDose} {prescribedUnits}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Route: {parsedOrder.rxr.routeName || 'Subcutaneous'} Daily
          </div>
        </div>

        {/* 3. Hospital Order Feed HL7 v2 */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155' }}>
              3. Hospital Order Feed
            </span>
            <span style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 600 }}>HL7 v2.5</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
            {parsedOrder.rxo.requestedDrugName}
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e293b' }}>
            Dose: {parsedOrder.rxo.requestedGiveAmount} {parsedOrder.rxo.requestedGiveUnits}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Route: {parsedOrder.rxr.routeName}
          </div>
        </div>
      </div>

      {/* Concordance Alert Banner */}
      {concordancePassed ? (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '5px',
            padding: '0.55rem 0.85rem',
            fontSize: '0.76rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span>
            <strong>Concordance Verified:</strong> Drug name, dosage ({prescribedDose} {prescribedUnits}), and route are 100% congruent across Bedside Indent, EHR Prescription, and Hospital HL7 Feed.
          </span>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '5px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#991b1b', fontSize: '0.78rem', fontWeight: 700 }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>Safety Hold Engaged — Concordance Mismatch Detected</span>
          </div>
          <p style={{ fontSize: '0.74rem', color: '#7f1d1d', margin: 0 }}>
            Fulfillment is locked by hospital clinical protocol until provider resolves discrepancy.
          </p>
          {reconciliation?.discrepancies?.map((disc, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                color: '#b91c1c',
                backgroundColor: '#ffffff',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #fecaca',
              }}
            >
              {disc}
            </div>
          ))}
        </div>
      )}

      {/* Raw HL7 v2 Message Toggle */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
        <button
          onClick={() => onToggleJson('hl7Raw')}
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
          <span>{expandedJson['hl7Raw'] ? 'Hide Raw HL7 Message' : 'Inspect Raw HL7 v2.5 OMP^O09 Pipe Delimited Message'}</span>
          {expandedJson['hl7Raw'] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expandedJson['hl7Raw'] && (
          <pre
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '5px',
              padding: '0.65rem',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: '#1e293b',
              overflowX: 'auto',
              marginTop: '0.5rem',
              margin: '0.5rem 0 0 0',
              lineHeight: 1.4,
            }}
          >
            {parsedOrder.rawMessage}
          </pre>
        )}
      </div>

      {/* Step Navigation Footer */}
      {!isAllInfoView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onBackToStep2}
            className="btn btn-outline"
            style={{ fontSize: '0.76rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
          >
            <ArrowLeft size={13} />
            <span>Previous: Validate Drug (Step 2)</span>
          </button>
          {concordancePassed ? (
            <button
              type="button"
              onClick={onAdvanceToStep4}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem', gap: '0.4rem', fontWeight: 600 }}
            >
              <span>Accept Concordance &amp; Proceed to Dispatch (Step 4)</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                disabled
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'not-allowed',
                  opacity: 0.9,
                }}
                title="Dispensing blocked: Clinical Safety Hold enforced due to 3-way concordance mismatch"
              >
                <Lock size={12} />
                <span>Dispensing Blocked (Clinical Safety Hold)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
