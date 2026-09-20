import React, { useMemo } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { DispensaryMedicationQueueProps } from './types';

export const DispensaryMedicationQueue: React.FC<DispensaryMedicationQueueProps> = ({
  availableIndents,
  activeIndent,
  onSelectIndent,
  onClearSelection,
  selectedScenarioId,
  onSelectScenario,
  scenarios,
  queueSearch,
  onSearchChange,
  queueFilter,
  onFilterChange,
}) => {
  const filteredIndents = useMemo(() => {
    return availableIndents.filter((ind) => {
      const matchesSearch =
        ind.requestedDrugName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        ind.patientName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        ind.patientRoomBed?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        ind.indentNumber?.toLowerCase().includes(queueSearch.toLowerCase());

      const matchesFilter =
        queueFilter === 'ALL'
          ? true
          : queueFilter === 'PENDING'
            ? ind.status === 'PENDING'
            : ind.status === 'DISPATCHED';

      return matchesSearch && matchesFilter;
    });
  }, [availableIndents, queueSearch, queueFilter]);

  const pendingCount = availableIndents.filter((i) => i.status === 'PENDING').length;
  const dispatchedCount = availableIndents.filter((i) => i.status === 'DISPATCHED').length;

  return (
    <div
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileText size={16} style={{ color: 'var(--clinical-blue)' }} />
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Medication Queue
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
            }}
          >
            {pendingCount} Pending
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
            }}
          >
            {dispatchedCount} Dispatched
          </span>
        </div>
      </div>

      {/* Deselect / Clear selection button when a patient is active */}
      {activeIndent && onClearSelection && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            id="btn-clear-patient-selection"
            data-testid="clear-patient-selection"
            onClick={onClearSelection}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              padding: '0.15rem 0.35rem',
              borderRadius: '4px',
            }}
            title="Deselect active patient and return to queue overview"
          >
            <X size={12} />
            <span>Clear Patient Selection</span>
          </button>
        </div>
      )}

      {/* Test Scenarios Dropdown */}
      <div>
        <label
          htmlFor="dispensary-scenario-select"
          style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}
        >
          Test Scenario Presets
        </label>
        <select
          id="dispensary-scenario-select"
          value={selectedScenarioId}
          onChange={(e) => onSelectScenario(e.target.value)}
          style={{
            width: '100%',
            padding: '0.4rem 0.5rem',
            fontSize: '0.76rem',
            borderRadius: '5px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: 'var(--text-primary)',
          }}
        >
          {scenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.title}
            </option>
          ))}
        </select>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            value={queueSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search patient, bed, or drug..."
            style={{
              width: '100%',
              padding: '0.35rem 0.5rem 0.35rem 1.65rem',
              fontSize: '0.75rem',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          {(['ALL', 'PENDING', 'DISPATCHED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              style={{
                flex: 1,
                padding: '0.25rem',
                fontSize: '0.68rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: queueFilter === filter ? '#f1f5f9' : '#ffffff',
                color: queueFilter === filter ? 'var(--clinical-blue)' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Indent List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '460px', overflowY: 'auto' }}>
        {filteredIndents.length === 0 ? (
          <div
            style={{
              padding: '1.5rem 1rem',
              textAlign: 'center',
              fontSize: '0.76rem',
              color: '#94a3b8',
              border: '1px dashed #e2e8f0',
              borderRadius: '6px',
            }}
          >
            No requests found in queue.
          </div>
        ) : (
          filteredIndents.map((ind) => {
            const isSelected = activeIndent?.id === ind.id;
            const isDispatchedItem = ind.status === 'DISPATCHED';

            return (
              <div
                key={ind.id}
                id={`dispensary-queue-item-${ind.indentNumber || ind.id}`}
                data-testid={`queue-item-${ind.id}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectIndent(ind)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectIndent(ind);
                  }
                }}
                style={{
                  padding: '0.6rem 0.7rem',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? 'var(--clinical-blue)' : '#e2e8f0'}`,
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 0 1px var(--clinical-blue)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                    {ind.patientRoomBed || 'Ward 4B Bed 12'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      backgroundColor: isDispatchedItem ? '#ecfdf5' : '#fef3c7',
                      color: isDispatchedItem ? '#065f46' : '#92400e',
                    }}
                  >
                    {isDispatchedItem ? 'DISPATCHED' : 'PENDING'}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clinical-blue)' }}>
                  {ind.requestedDrugName} {ind.requestedDose} {ind.requestedUnits}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.3rem',
                    fontSize: '0.68rem',
                    color: '#64748b',
                  }}
                >
                  <span>{ind.patientName}</span>
                  <span>#{ind.indentNumber}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
