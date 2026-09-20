import React from 'react';
import {
  ThermometerSnowflake,
  ClipboardCheck,
  Stethoscope,
  Truck,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface DispensaryDashboardProps {
  currentTemp: number;
  isColdChainExcursion: boolean;
  availableIndents: any[];
  activeIndent: any;
  onSelectIndent: (indent: any) => void;
  isDispatched: boolean;
  pharmacistName: string;
}

export const DispensaryDashboard: React.FC<DispensaryDashboardProps> = ({
  currentTemp,
  isColdChainExcursion,
  availableIndents,
  activeIndent,
  onSelectIndent,
  isDispatched,
  pharmacistName,
}) => {
  const pendingCount = availableIndents.filter((i) => i.status === 'PENDING').length;
  const dispatchedCount = availableIndents.filter((i) => i.status === 'DISPATCHED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
      {/* 1. Dispensary Command Center Header */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              color: 'var(--clinical-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Central Inpatient Dispensary &middot; Clinical Command Center
              </h1>
              <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                Role: PHARMACIST
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
                <ShieldCheck size={11} /> 3-Way Reconciliation Active
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Attending Pharmacist: <strong>{pharmacistName}</strong> &middot; Target Unit: <strong>Ward 4B Bed 12 (Elizabeth Warren, MRN-849201)</strong>
            </div>
          </div>
        </div>

        {/* Inpatient Indent Queue Switcher */}
        {availableIndents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Floor Indent:
            </span>
            <select
              value={activeIndent?.id || ''}
              onChange={(e) => {
                const found = availableIndents.find((i) => i.id === e.target.value);
                if (found) onSelectIndent(found);
              }}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                cursor: 'pointer',
                maxWidth: '280px',
              }}
            >
              {availableIndents.slice(0, 10).map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.indentNumber} &middot; {ind.requestedDrugName} {ind.requestedDose} {ind.requestedUnits} ({ind.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Organized KPI Dashboard Metrics (4-Card Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {/* Metric 1: Cold Chain Telemetry */}
        <div
          style={{
            backgroundColor: isColdChainExcursion ? '#fef2f2' : '#ffffff',
            border: `1px solid ${isColdChainExcursion ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Cold-Chain Temperature
            </span>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: isColdChainExcursion ? '#fee2e2' : '#eff6ff',
                color: isColdChainExcursion ? '#dc2626' : 'var(--clinical-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThermometerSnowflake size={14} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isColdChainExcursion ? '#dc2626' : 'var(--text-primary)' }}>
            {currentTemp.toFixed(1)}&deg;C
          </div>
          <div style={{ fontSize: '0.72rem', color: isColdChainExcursion ? '#b91c1c' : '#15803d', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            {isColdChainExcursion ? (
              <>
                <AlertTriangle size={11} /> Excursion Warning (&gt;8.0&deg;C)
              </>
            ) : (
              <>
                <CheckCircle2 size={11} /> Optimal Range (2.0&deg;C &ndash; 8.0&deg;C)
              </>
            )}
          </div>
        </div>

        {/* Metric 2: Floor Indent Queue */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ward 4B Indents
            </span>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck size={14} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {availableIndents.length} Orders
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
            <strong style={{ color: '#2563eb' }}>{pendingCount}</strong> Pending Double-Check &middot;{' '}
            <strong style={{ color: '#16a34a' }}>{dispatchedCount}</strong> Dispatched
          </div>
        </div>

        {/* Metric 3: Doctor EHR Prescription Gateway */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Doctor EHR Gateway
            </span>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#faf5ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={14} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            HL7 FHIR R4
          </div>
          <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <CheckCircle2 size={11} /> medreq-ord-2026-9042 Active
          </div>
        </div>

        {/* Metric 4: Courier Chain-of-Custody */}
        <div
          style={{
            backgroundColor: isDispatched ? '#f0fdf4' : '#ffffff',
            border: `1px solid ${isDispatched ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Courier Custody
            </span>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: isDispatched ? '#dcfce7' : '#f8fafc',
                color: isDispatched ? '#16a34a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={14} />
            </div>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            James Miller (COUR-409)
          </div>
          <div style={{ fontSize: '0.72rem', color: isDispatched ? '#15803d' : '#64748b', marginTop: '0.2rem', fontWeight: isDispatched ? 600 : 400 }}>
            {isDispatched ? 'En Route (ETA ~10m) · Ward 4B Fridge' : 'Standby at Central Dispensary'}
          </div>
        </div>
      </div>
    </div>
  );
};
