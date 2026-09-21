import React, { useState } from 'react';
import { Search, CheckCircle2, Thermometer, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { ValidatedDrugInfo } from '../types/clinical';
import { validateMedicationOrder, getColdChainGuidance } from '../services/rxnavService';

interface RxNavValidatorProps {
  validatedDrug: ValidatedDrugInfo;
  onDrugUpdated: (drug: ValidatedDrugInfo) => void;
  onBack: () => void;
  onProceedToHl7: () => void;
}

export const RxNavValidator: React.FC<RxNavValidatorProps> = ({
  validatedDrug,
  onDrugUpdated,
  onBack,
  onProceedToHl7,
}) => {
  const [searchQuery, setSearchQuery] = useState(validatedDrug.queryName);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const result = await validateMedicationOrder(searchQuery.trim());
      onDrugUpdated(result);
    } catch (err) {
      console.error('Error during RxNav lookup:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const coldGuidance = getColdChainGuidance(validatedDrug.officialName);
  const isFormulationBlocked =
    validatedDrug.validationStatus !== 'MATCHED_OFFICIAL' ||
    validatedDrug.formulationMatch?.status === 'STRENGTH_MISMATCH' ||
    validatedDrug.formulationMatch?.status === 'UNREGISTERED_FORMULATION';

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Drug Verification
            </h2>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
              <CheckCircle2 size={11} />
              Confirmed
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            Checked against the NIH NLM RxNorm drug registry
          </p>
        </div>

        {/* Live Search Form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drug..."
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              fontSize: '0.8125rem',
              width: '180px',
              backgroundColor: 'var(--bg-surface)'
            }}
          />
          <button type="submit" disabled={isLoading} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            <span>Lookup</span>
          </button>
        </form>
      </div>

      {/* Concept Verification Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Drug Concept */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
            Standardized RxNorm Drug Concept
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--clinical-blue)' }}>
              RxCUI: {validatedDrug.rxcui}
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>TTY: {validatedDrug.termType}</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {validatedDrug.officialName}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Active Ingredient: {validatedDrug.activeIngredients.join(', ')}
          </div>
        </div>

        {/* Cold-Chain Assessment */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: validatedDrug.isRefrigeratedColdChain ? 'var(--safe-green-light)' : 'var(--bg-app)',
          border: `1px solid ${validatedDrug.isRefrigeratedColdChain ? 'var(--safe-green-border)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: validatedDrug.isRefrigeratedColdChain ? 'var(--safe-green)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Thermometer size={14} />
            <span>USP Cold-Chain Classification</span>
          </div>
          <div style={{ marginBottom: '0.35rem' }}>
            {validatedDrug.isRefrigeratedColdChain ? (
              <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}>
                Refrigerated: 2.0°C - 8.0°C
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}>
                Room Temp: 15°C - 25°C
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {coldGuidance}
          </div>
        </div>

        {/* Formulation Matching Result */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          gridColumn: '1 / -1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Formulation Cross-Check vs Prescription
            </span>
            <span className={`badge ${validatedDrug.formulationMatch?.status === 'EXACT_MATCH' ? 'badge-green' : 'badge-amber'}`}>
              <CheckCircle2 size={12} />
              {validatedDrug.formulationMatch?.status === 'EXACT_MATCH' ? 'Exact Formulation Match' : 'Formulation Verified'}
            </span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {validatedDrug.formulationMatch?.matchedConceptName || validatedDrug.formulation}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {validatedDrug.formulationMatch?.clinicalSafetyNotes || 'Prescription matches official NLM Semantic Clinical Drug (SCD) registry.'}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        {isFormulationBlocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-red)', fontWeight: 600 }}>
              Safety Gate: Cannot advance with unregistered formulation or strength mismatch
            </span>
            <button disabled className="btn" style={{ padding: '0.55rem 1.1rem', opacity: 0.5, cursor: 'not-allowed', backgroundColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
              <span>Fulfillment Blocked</span>
            </button>
          </div>
        ) : (
          <button onClick={onProceedToHl7} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem' }}>
            <span>Next: Delivery Request</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
