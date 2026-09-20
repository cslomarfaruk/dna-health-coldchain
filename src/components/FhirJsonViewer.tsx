import React, { useState } from 'react';
import { Copy, Check, FileJson, CheckCircle2, ArrowLeft, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { FhirMedicationRequest, FhirMedicationDispense, FhirAuditEvent } from '../types/clinical';

interface FhirJsonViewerProps {
  medicationRequest: FhirMedicationRequest;
  medicationDispense: FhirMedicationDispense;
  auditEvent: FhirAuditEvent;
  activeWorkflow?: any;
  onBack: () => void;
  onRecoverWorkflow?: () => Promise<void>;
}

type FhirTab = 'DISPENSE' | 'MED_REQUEST' | 'AUDIT_EVENT';

export const FhirJsonViewer: React.FC<FhirJsonViewerProps> = ({
  medicationRequest,
  medicationDispense,
  auditEvent,
  activeWorkflow,
  onBack,
  onRecoverWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<FhirTab>('DISPENSE');
  const [copied, setCopied] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const isDispatched = activeWorkflow?.status === 'DISPATCHED' || Boolean(activeWorkflow?.fhirMedicationDispenseId);
  const isDispensing = activeWorkflow?.status === 'DISPENSING';

  const getActivePayload = () => {
    switch (activeTab) {
      case 'MED_REQUEST':
        return medicationRequest;
      case 'DISPENSE':
        return medicationDispense;
      case 'AUDIT_EVENT':
        return auditEvent;
    }
  };

  const activePayload = getActivePayload();
  const jsonString = JSON.stringify(activePayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRecover = async () => {
    if (!onRecoverWorkflow) return;
    setIsRecovering(true);
    try {
      await onRecoverWorkflow();
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
      {/* Header & Copy Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Hospital Electronic Health Record (EHR) &middot; Chart Records
            </h2>
            {isDispatched ? (
              <span className="badge badge-green">Chart Updated</span>
            ) : isDispensing ? (
              <span className="badge badge-yellow">Writing to Chart</span>
            ) : (
              <span className="badge badge-neutral">Ready for Fulfillment</span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            {isDispatched
              ? `Electronic patient chart record successfully committed upon Pharmacist dispatch (Dispense ID: ${activeWorkflow?.fhirMedicationDispenseId || medicationDispense.id})`
              : 'Electronic chart record prepared for automatic update upon Pharmacist authorization'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeWorkflow?.fhirMedicationDispenseId && (
            <a
              href={`https://hapi.fhir.org/baseR4/MedicationDispense/${activeWorkflow.fhirMedicationDispenseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', gap: '0.35rem', color: 'var(--clinical-blue)' }}
            >
              <ExternalLink size={13} />
              <span>View Remote EHR Record</span>
            </a>
          )}
          <button onClick={handleCopy} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            {copied ? <Check size={13} style={{ color: 'var(--safe-green)' }} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Record'}</span>
          </button>
        </div>
      </div>

      {/* Distributed Status Banner */}
      {isDispensing && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', fontSize: '0.82rem' }}>
            <AlertCircle size={16} />
            <span>Fulfillment recorded in queue. Chart record is being committed.</span>
          </div>
          {onRecoverWorkflow && (
            <button
              onClick={handleRecover}
              disabled={isRecovering}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={isRecovering ? 'spin' : ''} />
              {isRecovering ? 'Synchronizing...' : 'Synchronize Now'}
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('DISPENSE')}
          className={`tab-btn ${activeTab === 'DISPENSE' ? 'active' : ''}`}
        >
          <FileJson size={14} />
          <span>Dispense Record</span>
          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Active</span>
        </button>

        <button
          onClick={() => setActiveTab('MED_REQUEST')}
          className={`tab-btn ${activeTab === 'MED_REQUEST' ? 'active' : ''}`}
        >
          <FileJson size={14} />
          <span>Prescription Record</span>
          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>EHR</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_EVENT')}
          className={`tab-btn ${activeTab === 'AUDIT_EVENT' ? 'active' : ''}`}
        >
          <FileJson size={14} />
          <span>Security &amp; Audit Event</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Verified</span>
        </button>
      </div>

      {/* Clean Light Code Box */}
      <div className="code-box" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#1e293b' }}>
          {jsonString}
        </pre>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        {isDispatched ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--safe-green)', fontSize: '0.85rem', fontWeight: 600 }}>
            <CheckCircle2 size={16} />
            <span>Workflow Fulfilled &amp; Chart Updated (Record ID: {activeWorkflow?.fhirMedicationDispenseId || medicationDispense.id})</span>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>
            Awaiting Pharmacist Fulfillment in Step 4 (Pack &amp; Dispatch)
          </div>
        )}
      </div>
    </div>
  );
};
