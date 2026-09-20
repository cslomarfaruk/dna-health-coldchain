import React from 'react';
import {
  Building2,
  ThermometerSnowflake,
  ShieldCheck,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';
import { DispensaryHeaderProps } from './types';

export const DispensaryHeader: React.FC<DispensaryHeaderProps> = ({
  coolerPackage,
  isColdChainExcursion,
  showTempControls,
  onToggleTempControls,
  onUpdateTemp,
  pharmacistName,
  backendError,
  onClearBackendError,
}) => {
  return (
    <>
      {/* Backend Error / Notice */}
      {backendError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '0.65rem 0.95rem',
            fontSize: '0.78rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{backendError}</span>
          </div>
          <button
            type="button"
            onClick={onClearBackendError}
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.15rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: 'var(--clinical-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Central Pharmacy Dispensary
                </h1>
                <span className="badge badge-blue" style={{ fontSize: '0.66rem' }}>
                  Ward 4B Station
                </span>
                <span className="badge badge-green" style={{ fontSize: '0.66rem', gap: '0.25rem' }}>
                  <ShieldCheck size={11} /> EHR Connected
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Pharmacist: <strong>{pharmacistName}</strong> &middot; Order Processing Console
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Real-time Cold Chain Telemetry Pill */}
            <div
              onClick={onToggleTempControls}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                backgroundColor: isColdChainExcursion ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${isColdChainExcursion ? '#fca5a5' : '#bbf7d0'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to simulate temperature excursion"
            >
              <ThermometerSnowflake
                size={16}
                style={{ color: isColdChainExcursion ? '#dc2626' : '#16a34a' }}
              />
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isColdChainExcursion ? '#991b1b' : '#166534',
                  }}
                >
                  Storage Temp: {coolerPackage.currentTempCelsius.toFixed(1)}&deg;C
                </div>
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: isColdChainExcursion ? '#dc2626' : '#15803d',
                  }}
                >
                  {isColdChainExcursion ? 'Excursion Alert (<2°C or >8°C)' : 'Safe (2–8°C ✓)'}
                </div>
              </div>
            </div>

            {/* Pipeline Guide Action */}
            <button
              onClick={onToggleTempControls}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '0.35rem' }}
              title="Test cold chain excursion guards"
            >
              <Layers size={13} />
              <span>5-Step Clinical Pipeline</span>
            </button>
          </div>
        </div>

        {/* Expandable Cold-Chain Testing Simulator */}
        {showTempControls && (
          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
              Cold-Chain Excursion Simulator:
            </span>
            <button
              onClick={() => onUpdateTemp(4.2)}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#16a34a', borderColor: '#bbf7d0' }}
            >
              Set Normal (4.2&deg;C)
            </button>
            <button
              onClick={() => onUpdateTemp(9.5)}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#dc2626', borderColor: '#fca5a5' }}
            >
              Trigger High Excursion (9.5&deg;C)
            </button>
            <button
              onClick={() => onUpdateTemp(1.2)}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#2563eb', borderColor: '#bfdbfe' }}
            >
              Trigger Low Excursion (1.2&deg;C)
            </button>
          </div>
        )}
      </div>
    </>
  );
};
