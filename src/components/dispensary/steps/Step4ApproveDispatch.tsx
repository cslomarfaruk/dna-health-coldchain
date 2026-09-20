import React from 'react';
import {
  Check,
  CheckCircle2,
  ThermometerSnowflake,
  Truck,
  AlertTriangle,
  RefreshCw,
  Send,
  Lock,
  Code,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Step4ApproveDispatchProps } from '../types';

export const Step4ApproveDispatch: React.FC<Step4ApproveDispatchProps> = ({
  isAllInfoView = false,
  coolerPackage,
  isColdChainExcursion,
  concordancePassed,
  isOrderDispatched,
  isFulfilling,
  onAuthorizeFulfillment,
  fhirMedDispense,
  nurseAlert,
  backendError,
  onClearBackendError,
  onAdvanceToStep5,
  onBackToStep3,
  expandedJson,
  onToggleJson,
}) => {
  const handleAuthorize = async () => {
    const success = await onAuthorizeFulfillment();
    if (success !== false && onAdvanceToStep5) {
      onAdvanceToStep5();
    }
  };

  return (
    <div
      id="section-dispense"
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
            {isAllInfoView ? <Check size={12} strokeWidth={3} /> : '4'}
          </span>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Approve &amp; Dispatch &middot; Cold-Chain &amp; FHIR Dispense
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Requirement 4: Package medication, verify temperature, authorize dispatch, and update patient chart
            </div>
          </div>
        </div>
        <span className={`badge ${isAllInfoView ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
          {isAllInfoView ? (
            <>
              <CheckCircle2 size={11} />
              <span>Dispatched &middot; {coolerPackage.coolerBoxId || 'COOLER-MED-59'}</span>
            </>
          ) : (
            <span>Container: {coolerPackage.coolerBoxId || 'COOLER-MED-59'}</span>
          )}
        </span>
      </div>

      {/* Packaging & Courier Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Temp Telemetry Card */}
        <div
          style={{
            backgroundColor: isColdChainExcursion ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${isColdChainExcursion ? '#fca5a5' : '#bbf7d0'}`,
            borderRadius: '6px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ThermometerSnowflake size={24} style={{ color: isColdChainExcursion ? '#dc2626' : '#16a34a' }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isColdChainExcursion ? '#991b1b' : '#166534' }}>
              {coolerPackage.currentTempCelsius.toFixed(1)}&deg;C
            </div>
            <div style={{ fontSize: '0.68rem', color: isColdChainExcursion ? '#b91c1c' : '#15803d' }}>
              {isColdChainExcursion ? '⚠ Temp Excursion (Out of 2–8°C)' : 'Calibrated Safe (2–8°C)'}
            </div>
          </div>
        </div>

        {/* Courier Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: 'var(--clinical-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
              James Miller (COUR-409)
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Courier &middot; ETA ~10 min to {nurseAlert?.destinationDropZone || 'Ward 4B Lockbox A'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Button / Dispatched Status */}
      <div style={{ marginBottom: '1rem' }}>
        {backendError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              marginBottom: '0.55rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.78rem',
              color: '#991b1b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{backendError}</span>
            </div>
            {onClearBackendError && (
              <button
                onClick={onClearBackendError}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#991b1b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {isOrderDispatched ? (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} style={{ color: '#059669' }} />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#065f46' }}>
                  Order Dispatched &amp; In Transit &middot; Courier James Miller
                </div>
                <div style={{ fontSize: '0.72rem', color: '#047857' }}>
                  Record #{fhirMedDispense.id || '4920'} written to patient EHR chart.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  color: '#065f46',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '4px',
                  border: '1px solid #a7f3d0',
                }}
              >
                DISPATCHED
              </span>
              {!isAllInfoView && onAdvanceToStep5 && (
                <button
                  type="button"
                  onClick={onAdvanceToStep5}
                  className="btn btn-primary"
                  style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', gap: '0.3rem' }}
                >
                  <span>Next: HIPAA Compliance</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        ) : concordancePassed && !isColdChainExcursion ? (
          <button
            onClick={handleAuthorize}
            disabled={isFulfilling}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--clinical-blue)',
              boxShadow: '0 2px 4px rgba(2,132,199,0.2)',
              cursor: isFulfilling ? 'not-allowed' : 'pointer',
            }}
          >
            {isFulfilling ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Authorizing dispatch &amp; updating patient chart...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Approve &amp; Send to Ward 4B</span>
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.86rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'not-allowed',
            }}
          >
            <Lock size={15} />
            <span>
              {isColdChainExcursion
                ? 'Dispatch Blocked: Storage Temperature Out of Range'
                : 'Dispatch Blocked: Clinical Reconciliation Mismatch'}
            </span>
          </button>
        )}
      </div>

      {/* Patient Chart Record (FHIR MedicationDispense) Summary Card */}
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
            Patient Chart Record &middot; FHIR MedicationDispense
          </span>
          <span className={`badge ${isOrderDispatched ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
            {isOrderDispatched ? 'Recorded in EHR' : 'Draft Prepared'}
          </span>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#475569' }}>
          Resource ID: <strong>MedicationDispense/{fhirMedDispense.id || '4920'}</strong> &middot; Status: <strong>{isOrderDispatched ? 'completed' : 'in-progress'}</strong>
        </div>
      </div>

      {/* Raw FHIR MedicationDispense JSON Toggle */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
        <button
          onClick={() => onToggleJson('fhirMedDispense')}
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
          <span>{expandedJson['fhirMedDispense'] ? 'Hide Raw FHIR Resource' : 'Inspect Raw FHIR MedicationDispense JSON'}</span>
          {expandedJson['fhirMedDispense'] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expandedJson['fhirMedDispense'] && (
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
            {JSON.stringify(fhirMedDispense, null, 2)}
          </pre>
        )}
      </div>

      {/* Step Navigation Footer */}
      {!isAllInfoView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onBackToStep3}
            className="btn btn-outline"
            style={{ fontSize: '0.76rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
          >
            <ArrowLeft size={13} />
            <span>Previous: Process Delivery (Step 3)</span>
          </button>
          {isOrderDispatched ? (
            <button
              type="button"
              onClick={onAdvanceToStep5}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem', gap: '0.4rem', fontWeight: 600 }}
            >
              <span>Proceed to HIPAA Compliance &amp; Audit (Step 5)</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled
              style={{
                backgroundColor: '#f1f5f9',
                color: '#94a3b8',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'not-allowed',
              }}
              title="Step 5 is locked until the medication is authorized and dispatched"
            >
              <Lock size={12} />
              <span>Step 5 Locked (Requires Dispatch Approval)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
