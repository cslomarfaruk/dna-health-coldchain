import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, RefreshCw, ArrowRight, ArrowLeft, Clock, UserCheck } from 'lucide-react';
import { CoolerPackage } from '../services/coldChainService';

interface ColdChainCardProps {
  coolerPackage: CoolerPackage;
  onUpdateTemp: (newTemp: number) => void;
  onBack: () => void;
  onProceedToHipaa: () => void;
  isFulfilling?: boolean;
  isDispatched?: boolean;
}

export const ColdChainCard: React.FC<ColdChainCardProps> = ({
  coolerPackage,
  onUpdateTemp,
  onBack,
  onProceedToHipaa,
  isFulfilling = false,
  isDispatched = false,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const currentTemp = coolerPackage.currentTempCelsius;
  const isNominal = currentTemp >= 2.0 && currentTemp <= 8.0;

  const handleSimulatePing = () => {
    setIsSimulating(true);
    const drift = (Math.random() - 0.5) * 0.4;
    const newTemp = Number(Math.max(2.2, Math.min(6.5, currentTemp + drift)).toFixed(1));
    setTimeout(() => {
      onUpdateTemp(newTemp);
      setIsSimulating(false);
    }, 200);
  };

  const handleTriggerExcursion = () => {
    onUpdateTemp(9.2);
  };

  const handleResetNominal = () => {
    onUpdateTemp(3.8);
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Pack & Dispatch
            </h2>
            <span className={`badge ${isNominal ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
              {isNominal ? <ShieldCheck size={11} /> : <AlertOctagon size={11} />}
              {isNominal ? '2°C – 8°C OK' : 'Temp Alert (>8°C)'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            Cooler packed, courier assigned, temperature monitored during transit
          </p>
        </div>

        {/* Quick Simulation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleSimulatePing}
            disabled={isSimulating}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          >
            <RefreshCw size={12} className={isSimulating ? 'animate-spin' : ''} />
            <span>Probe Ping</span>
          </button>

          {isNominal ? (
            <button
              onClick={handleTriggerExcursion}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--danger-red)' }}
            >
              Test Alert (&gt;8°C)
            </button>
          ) : (
            <button
              onClick={handleResetNominal}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--safe-green)' }}
            >
              Restore Safe (3.8°C)
            </button>
          )}
        </div>
      </div>

      {/* Main Cold Chain Display Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Temperature Reading */}
        <div style={{
          padding: '1.25rem',
          backgroundColor: isNominal ? 'var(--safe-green-light)' : 'var(--danger-red-light)',
          border: `1px solid ${isNominal ? 'var(--safe-green-border)' : 'var(--danger-red-border)'}`,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Calibrated Probe Temperature
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: isNominal ? 'var(--safe-green)' : 'var(--danger-red)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1
              }}>
                {currentTemp.toFixed(1)}°C
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isNominal ? 'Safe Storage' : 'Out of Specification'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Allowed USP Limit: <strong>2.0°C to 8.0°C</strong> &middot; Box ID: <code>{coolerPackage.coolerBoxId}</code>
          </div>
        </div>

        {/* Courier Details */}
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Assigned Hospital Courier
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--clinical-blue-light)',
                color: 'var(--clinical-blue-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {coolerPackage.courier.courierName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ID: {coolerPackage.courier.courierId} &middot; Pharmacy Transport
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--clinical-blue-dark)', fontWeight: 600 }}>
            <Clock size={14} />
            <span>ETA: {coolerPackage.courier.estimatedArrivalMinutes} minutes to {coolerPackage.courier.destinationWardFridge}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        <button
          onClick={onProceedToHipaa}
          disabled={isFulfilling}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', gap: '0.5rem', fontWeight: 600 }}
        >
          {isFulfilling ? (
            <>
              <RefreshCw size={15} className="spin" />
              <span>Authorizing &amp; Writing to HAPI FHIR...</span>
            </>
          ) : isDispatched ? (
            <>
              <span>Proceed to Floor Alert (Already Dispatched)</span>
              <ArrowRight size={15} />
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>Authorize Fulfillment &amp; Dispatch (Write to FHIR)</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
