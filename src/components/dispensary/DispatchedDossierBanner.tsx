import React from 'react';
import { CheckCircle2, Printer, Layers, Check } from 'lucide-react';
import { DispatchedDossierBannerProps } from './types';

export const DispatchedDossierBanner: React.FC<DispatchedDossierBannerProps> = ({
  onViewBySteps,
}) => {
  return (
    <div
      id="dispatched-dossier-banner"
      className="card"
      style={{
        padding: '0.85rem 1.15rem',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#14532d', letterSpacing: '-0.2px' }}>
                Dispatched Medication Record &middot; Complete Clinical Dossier
              </span>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  border: '1px solid #86efac',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Dispense Complete
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '0.2rem' }}>
              This medication request has been authorized and dispatched. All clinical records, formulation validations, 3-way concordance proof, and cold-chain telemetry are presented together below.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-outline"
            style={{
              fontSize: '0.74rem',
              padding: '0.35rem 0.75rem',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              borderColor: '#86efac',
              color: '#15803d',
              fontWeight: 600,
            }}
            title="Print complete clinical dispense record and carrier label"
          >
            <Printer size={14} />
            <span>Print Record</span>
          </button>

          <button
            type="button"
            onClick={onViewBySteps}
            className="btn btn-outline"
            style={{
              fontSize: '0.74rem',
              padding: '0.35rem 0.7rem',
              gap: '0.35rem',
              backgroundColor: '#ffffff',
              borderColor: '#cbd5e1',
              color: '#475569',
            }}
            title="Switch to step-by-step audit pipeline view"
          >
            <Layers size={13} />
            <span>View by Steps</span>
          </button>
        </div>
      </div>

      {/* Section Quick Jump Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid #bbf7d0',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>
          Dossier Sections:
        </span>
        {[
          { id: 'section-rx', label: '1. Prescription & Chart' },
          { id: 'section-rxnorm', label: '2. Drug Validation' },
          { id: 'section-concordance', label: '3. 3-Way Concordance' },
          { id: 'section-dispense', label: '4. Cold Chain & Dispense' },
          { id: 'section-audit', label: '5. HIPAA Audit & Alerts' },
        ].map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              fontSize: '0.7rem',
              color: '#166534',
              backgroundColor: '#ffffff',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              border: '1px solid #bbf7d0',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={11} strokeWidth={3} style={{ color: '#16a34a' }} />
            <span>{sec.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
