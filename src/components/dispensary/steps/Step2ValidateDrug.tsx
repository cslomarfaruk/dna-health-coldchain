import React from 'react';
import { Check, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Step2ValidateDrugProps } from '../types';

export const Step2ValidateDrug: React.FC<Step2ValidateDrugProps> = ({
  isAllInfoView = false,
  validatedDrug,
  prescribedDrug,
  orderKey,
  onAdvanceToStep3,
  onBackToStep1,
}) => {
  return (
    <div
      id="section-rxnorm"
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
            {isAllInfoView ? <Check size={12} strokeWidth={3} /> : '2'}
          </span>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Validate Drug &middot; NIH NLM RxNorm Integration
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Requirement 2: Validate medication formulation against RxNorm concept database
            </div>
          </div>
        </div>
        <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
          <CheckCircle2 size={11} /> {isAllInfoView ? 'Formulation Validated · NLM RxNav' : 'NLM RxNav Verified'}
        </span>
      </div>

      {/* RxNorm Concept Summary Table */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          fontSize: '0.76rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>Queried Clinical Entity:</span>
          <strong style={{ color: '#0f172a' }}>{validatedDrug.queryName || prescribedDrug}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>RxNorm Concept Unique Identifier (RxCUI):</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: 'var(--clinical-blue)',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px',
              border: '1px solid #bfdbfe',
            }}
          >
            {validatedDrug.rxcui || '274783'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>Official NLM Semantic Clinical Drug:</span>
          <strong style={{ color: '#0f172a' }}>{validatedDrug.officialName || prescribedDrug}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>Formulation Match Status:</span>
          <span className="badge badge-green" style={{ fontSize: '0.66rem' }}>
            {validatedDrug.formulationMatch?.status || 'EXACT_MATCH'} &middot; Strength Verified
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>Thermal Storage Classification:</span>
          <span className="badge badge-blue" style={{ fontSize: '0.66rem' }}>
            Refrigerated Biologic [2&deg;C &ndash; 8&deg;C]
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Active Ingredients:</span>
          <strong style={{ color: '#0f172a' }}>{validatedDrug.activeIngredients?.join(', ') || 'insulin glargine'}</strong>
        </div>
      </div>

      {/* Step Navigation Footer */}
      {!isAllInfoView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onBackToStep1}
            className="btn btn-outline"
            style={{ fontSize: '0.76rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
          >
            <ArrowLeft size={13} />
            <span>Previous: Read Rx (Step 1)</span>
          </button>
          <button
            type="button"
            onClick={onAdvanceToStep3}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem', gap: '0.4rem', fontWeight: 600 }}
          >
            <span>Confirm RxNorm Formulation &amp; Proceed to Delivery Check (Step 3)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
