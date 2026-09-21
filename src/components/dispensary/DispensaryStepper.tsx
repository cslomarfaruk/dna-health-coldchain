import React from 'react';
import { AlertTriangle, Lock, Check } from 'lucide-react';
import { DispensaryStepperProps } from './types';

export const DispensaryStepper: React.FC<DispensaryStepperProps> = ({
  steps,
  activeStep,
  isStepAccessible,
  stepNotice,
  onClearStepNotice,
  onStepClick,
  isOrderDispatched,
  onShowAllInfo,
}) => {
  return (
    <div
      className="card"
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Prescription Fulfillment Pipeline &middot; Case Requirements (1 &ndash; 5)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isOrderDispatched && (
            <button
              type="button"
              onClick={onShowAllInfo}
              className="btn btn-outline"
              style={{
                fontSize: '0.7rem',
                padding: '0.2rem 0.55rem',
                color: '#15803d',
                borderColor: '#86efac',
                backgroundColor: '#f0fdf4',
                fontWeight: 600,
              }}
            >
              Show All Information
            </button>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Step {activeStep} of 5 Active
          </span>
        </div>
      </div>

      {/* Step Progression Notice / Safety Warning */}
      {stepNotice && (
        <div
          id="dispensary-step-notice"
          data-testid="dispensary-step-notice"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '0.6rem 0.85rem',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{stepNotice}</span>
          </div>
          <button
            type="button"
            onClick={onClearStepNotice}
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              padding: '0 0.25rem',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Step Cards Row */}
      <div
        className="stepper-grid-responsive"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '0.45rem',
        }}
      >
        {steps.map((st) => {
          const isActive = activeStep === st.num;
          const isAccessible = isStepAccessible(st.num);
          const isFinished = st.isComplete;
          const hasProblem = st.hasError;

          let bgColor = '#f8fafc';
          let borderColor = '#e2e8f0';
          let circleBg = '#cbd5e1';
          let circleColor = '#475569';
          let titleColor = '#475569';

          if (isActive) {
            bgColor = '#eff6ff';
            borderColor = '#93c5fd';
            circleBg = 'var(--clinical-blue)';
            circleColor = '#ffffff';
            titleColor = 'var(--clinical-blue-dark)';
          } else if (!isAccessible) {
            bgColor = '#f8fafc';
            borderColor = '#f1f5f9';
            circleBg = '#e2e8f0';
            circleColor = '#94a3b8';
            titleColor = '#94a3b8';
          } else if (hasProblem) {
            bgColor = '#fef2f2';
            borderColor = '#fca5a5';
            circleBg = '#dc2626';
            circleColor = '#ffffff';
            titleColor = '#991b1b';
          } else if (isFinished) {
            bgColor = '#f0fdf4';
            borderColor = '#bbf7d0';
            circleBg = '#16a34a';
            circleColor = '#ffffff';
            titleColor = '#166534';
          }

          return (
            <button
              key={st.num}
              id={`dispensary-step-tab-${st.num}`}
              data-testid={`step-tab-${st.num}`}
              type="button"
              onClick={() => onStepClick(st.num)}
              style={{
                backgroundColor: bgColor,
                border: `1.5px solid ${borderColor}`,
                borderRadius: '6px',
                padding: '0.5rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                opacity: isAccessible ? 1 : 0.6,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(2, 132, 199, 0.15)' : 'none',
              }}
              title={
                !isAccessible
                  ? `Step ${st.num} is locked. Verification steps must be completed sequentially.`
                  : `Step ${st.num}: ${st.title} (${st.standard})`
              }
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: circleBg,
                  color: circleColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {!isAccessible ? (
                  <Lock size={11} />
                ) : isFinished && !hasProblem ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  st.num
                )}
              </div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: titleColor,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>Step {st.num}: {st.title}</span>
                  {!isAccessible && (
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600 }}>
                      (Locked)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: isActive ? '#0369a1' : !isAccessible ? '#94a3b8' : '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {st.standard}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
