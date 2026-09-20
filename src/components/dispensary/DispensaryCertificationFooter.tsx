import React from 'react';
import { ShieldCheck, Printer } from 'lucide-react';
import { DispensaryCertificationFooterProps } from './types';

export const DispensaryCertificationFooter: React.FC<DispensaryCertificationFooterProps> = ({
  pharmacistName,
}) => {
  return (
    <div
      className="card"
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
            Clinical Dispense Record Certified &middot; Non-Repudiation Seal Active
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            Verified by Pharmacist {pharmacistName} &middot; SHA-256 Audit Trail Locked &middot; HL7 OMP^O09 &amp; FHIR R4 Synchronized
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ fontSize: '0.76rem', padding: '0.45rem 0.9rem', gap: '0.4rem', fontWeight: 600 }}
        >
          <Printer size={14} />
          <span>Print Complete Dispense Record</span>
        </button>
      </div>
    </div>
  );
};
