import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

export type PipelineStage = 'INDENT' | 'RXNORM_VALIDATED' | 'HL7_PARSED' | 'PACKED_DISPATCHED' | 'NURSE_NOTIFIED' | 'FHIR_RECORDED';

interface Step {
  id: PipelineStage;
  num: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 'INDENT', num: 1, label: "Doctor's Order" },
  { id: 'RXNORM_VALIDATED', num: 2, label: 'Verify Drug' },
  { id: 'HL7_PARSED', num: 3, label: 'Delivery Request' },
  { id: 'PACKED_DISPATCHED', num: 4, label: 'Pack & Dispatch' },
  { id: 'NURSE_NOTIFIED', num: 5, label: 'Notify Nurse' },
  { id: 'FHIR_RECORDED', num: 6, label: 'Update Chart' },
];

export interface StageStatusMap {
  INDENT: boolean;
  RXNORM_VALIDATED: boolean;
  HL7_PARSED: boolean;
  PACKED_DISPATCHED: boolean;
  NURSE_NOTIFIED: boolean;
  FHIR_RECORDED: boolean;
}

interface PipelineTimelineProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
  isExcursion?: boolean;
  maxAccessibleIndex?: number;
  stageStatuses: StageStatusMap;
  reconciliationFailed?: boolean;
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({
  currentStage,
  onSelectStage,
  isExcursion,
  maxAccessibleIndex,
  stageStatuses,
  reconciliationFailed,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStage);
  const maxAllowed = maxAccessibleIndex !== undefined ? maxAccessibleIndex : currentIndex;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '0.85rem 1rem',
      marginBottom: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Pharmacist Dispensary Pipeline &middot; Step {currentIndex + 1} of {STEPS.length}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {reconciliationFailed && (
            <span className="badge badge-red" style={{ gap: '0.35rem' }}>
              <AlertTriangle size={12} />
              Reconciliation Discrepancy (Safety Gate Locked)
            </span>
          )}
          {isExcursion && (
            <span className="badge badge-red" style={{ gap: '0.35rem' }}>
              <AlertTriangle size={12} />
              Cold-Chain Temperature Alert
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))`,
        gap: '0.4rem',
      }}>
        {STEPS.map((step, idx) => {
          // A step is done ONLY IF its clinical action has actually succeeded!
          const isDone = stageStatuses[step.id] === true;
          const isCurrent = idx === currentIndex;
          const isAccessible = idx <= maxAllowed;
          const isReconFailureStep = step.id === 'HL7_PARSED' && reconciliationFailed;

          let bg = 'var(--bg-subtle)';
          let borderColor = 'var(--border-subtle)';
          let textColor = 'var(--text-muted)';
          let numBg = 'var(--border-strong)';
          let numColor = 'var(--text-secondary)';

          if (isReconFailureStep) {
            bg = 'var(--accent-red-light)';
            borderColor = 'var(--accent-red-border)';
            textColor = 'var(--accent-red)';
            numBg = 'var(--accent-red)';
            numColor = '#ffffff';
          } else if (isDone) {
            bg = 'var(--safe-green-light)';
            borderColor = 'var(--safe-green-border)';
            textColor = 'var(--text-primary)';
            numBg = 'var(--safe-green)';
            numColor = '#ffffff';
          } else if (isCurrent) {
            bg = 'var(--clinical-blue-light)';
            borderColor = '#bae6fd';
            textColor = 'var(--clinical-blue-dark)';
            numBg = 'var(--clinical-blue)';
            numColor = '#ffffff';
          }

          return (
            <button
              key={step.id}
              disabled={!isAccessible}
              onClick={() => isAccessible && onSelectStage(step.id)}
              style={{
                backgroundColor: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.6rem',
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                opacity: isAccessible ? 1 : 0.45,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
              title={
                !isAccessible
                  ? 'Step locked: Complete earlier verification steps first'
                  : isReconFailureStep
                  ? 'Reconciliation Discrepancy Detected'
                  : isDone
                  ? 'Verified / Completed'
                  : 'Pending Clinical Action'
              }
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: numBg,
                color: numColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {isReconFailureStep ? (
                  <AlertTriangle size={11} strokeWidth={3} />
                ) : isDone ? (
                  <Check size={11} strokeWidth={3} />
                ) : (
                  step.num
                )}
              </div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: isCurrent ? 600 : 500,
                color: textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
