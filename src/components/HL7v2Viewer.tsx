import React, { useState } from 'react';
import { Terminal, CheckCircle2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Omp09ParsedOrder } from '../types/clinical';

export interface ReconciliationSummary {
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

interface HL7v2ViewerProps {
  parsedOrder: Omp09ParsedOrder;
  onBack: () => void;
  onProceedToDispatch: () => void;
  reconciliation?: ReconciliationSummary | null;
}

export const HL7v2Viewer: React.FC<HL7v2ViewerProps> = ({
  parsedOrder,
  onBack,
  onProceedToDispatch,
  reconciliation,
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const isReconciliationBlocked = reconciliation && reconciliation.overallStatus !== 'PASSED';

  return (
    <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Hospital Delivery Order
            </h2>
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
              Order Received
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            Inpatient pharmacy delivery request received from hospital order communication system
          </p>
        </div>

        <button
          onClick={() => setShowRaw(!showRaw)}
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
        >
          <Terminal size={13} />
          <span>{showRaw ? 'Hide Original Message' : 'View Original Message Feed'}</span>
          {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Raw message viewer if expanded */}
      {showRaw && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="code-box" style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {parsedOrder.rawMessage.trim().split(/\r\n|\r|\n/).map((line, idx) => (
              <div
                key={idx}
                style={{
                  whiteSpace: 'pre',
                  color: line.startsWith('MSH') ? '#0284c7' : line.startsWith('RXO') ? '#16a34a' : '#334155',
                  fontWeight: line.startsWith('MSH') || line.startsWith('RXO') ? 600 : 400,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean Parsed Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Message Header</span>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>Inpatient Pharmacy Order</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From: {parsedOrder.msh.sendingApp}</div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Patient Record</span>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{parsedOrder.pid.patientName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MRN: {parsedOrder.pid.patientId}</div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Prescription Order</span>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{parsedOrder.rxo.requestedDrugName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Give: {parsedOrder.rxo.requestedGiveAmount} {parsedOrder.rxo.requestedGiveUnits} &middot; {parsedOrder.rxr.routeName}</div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Order Verification</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
              <CheckCircle2 size={12} />
              Structure Confirmed
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Ready for 3-way reconciliation
          </div>
        </div>
      </div>

      {/* 3-Way Reconciliation Status Display */}
      {reconciliation && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isReconciliationBlocked ? '#fff5f5' : '#f0fdf4',
            border: `1px solid ${isReconciliationBlocked ? '#fed7d7' : '#bbf7d0'}`,
            borderLeft: `4px solid ${isReconciliationBlocked ? 'var(--accent-red)' : 'var(--safe-green)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isReconciliationBlocked ? 'var(--accent-red)' : 'var(--safe-green)' }}>
                3-Way Medication Reconciliation: {reconciliation.overallStatus}
              </span>
              <span className={`badge ${isReconciliationBlocked ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.68rem' }}>
                {isReconciliationBlocked ? 'Safety Gate Enforced' : 'Concordance Verified'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Bedside Request &middot; Doctor Prescription &middot; Pharmacy Order
            </span>
          </div>

          {/* Concordance Attribute Matrix Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: reconciliation.patientMatch ? '#dcfce7' : '#fee2e2',
                color: reconciliation.patientMatch ? '#166534' : '#991b1b',
                border: `1px solid ${reconciliation.patientMatch ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Patient MRN:</span>
              {reconciliation.patientMatch ? <Check size={11} /> : <X size={11} />}
              <span>{reconciliation.patientMatch ? 'Matched' : 'Mismatch'}</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: reconciliation.medicationMatch ? '#dcfce7' : '#fee2e2',
                color: reconciliation.medicationMatch ? '#166534' : '#991b1b',
                border: `1px solid ${reconciliation.medicationMatch ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Medication &amp; Concept:</span>
              {reconciliation.medicationMatch ? <Check size={11} /> : <X size={11} />}
              <span>{reconciliation.medicationMatch ? 'Matched' : 'Mismatch'}</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: reconciliation.doseMatch ? '#dcfce7' : '#fee2e2',
                color: reconciliation.doseMatch ? '#166534' : '#991b1b',
                border: `1px solid ${reconciliation.doseMatch ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Dose &amp; Units:</span>
              {reconciliation.doseMatch ? <Check size={11} /> : <X size={11} />}
              <span>{reconciliation.doseMatch ? 'Matched' : 'Mismatch'}</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: reconciliation.routeMatch ? '#dcfce7' : '#fee2e2',
                color: reconciliation.routeMatch ? '#166534' : '#991b1b',
                border: `1px solid ${reconciliation.routeMatch ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Route:</span>
              {reconciliation.routeMatch ? <Check size={11} /> : <X size={11} />}
              <span>{reconciliation.routeMatch ? 'Matched' : 'Mismatch'}</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: reconciliation.formulationMatch && reconciliation.strengthMatch ? '#dcfce7' : '#fee2e2',
                color: reconciliation.formulationMatch && reconciliation.strengthMatch ? '#166534' : '#991b1b',
                border: `1px solid ${reconciliation.formulationMatch && reconciliation.strengthMatch ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Formulation:</span>
              {reconciliation.formulationMatch && reconciliation.strengthMatch ? <Check size={11} /> : <X size={11} />}
              <span>{reconciliation.formulationMatch && reconciliation.strengthMatch ? 'Matched' : 'Mismatch'}</span>
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: isReconciliationBlocked ? '0.5rem' : '0' }}>
            {reconciliation.summary}
          </div>

          {reconciliation.discrepancies.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
              {reconciliation.discrepancies.map((d, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fee2e2',
                    borderRadius: '4px',
                    padding: '0.35rem 0.55rem',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.45rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      padding: '0.08rem 0.35rem',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Flag {i + 1}
                  </span>
                  <span style={{ color: '#991b1b', wordBreak: 'break-word', fontWeight: 500 }}>
                    {d}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        {isReconciliationBlocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-red)', fontWeight: 600 }}>
              Safety Gate: Cannot dispatch until 3-way reconciliation passes
            </span>
            <button disabled className="btn" style={{ padding: '0.55rem 1.1rem', opacity: 0.5, cursor: 'not-allowed', backgroundColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
              <span>Fulfillment Blocked</span>
            </button>
          </div>
        ) : (
          <button onClick={onProceedToDispatch} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem' }}>
            <span>Next: Pack & Dispatch</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
