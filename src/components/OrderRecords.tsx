import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  ThermometerSnowflake,
  ShieldCheck,
  ChevronRight,
  X,
  Copy,
  ExternalLink,
  Code,
  Eye,
  ArrowRight,
  Send,
  Layers,
  Activity,
  UserCheck,
  ChevronLeft,
} from 'lucide-react';
import { Omp09ParsedOrder, FhirMedicationRequest, FhirMedicationDispense, FhirAuditEvent } from '../types/clinical';
import { SampleHl7Scenario } from '../data/sampleHl7Messages';

interface OrderRecordsProps {
  parsedOrder: Omp09ParsedOrder;
  fhirMedRequest: FhirMedicationRequest;
  fhirMedDispense: FhirMedicationDispense;
  fhirAuditEvent: FhirAuditEvent;
  scenarios: SampleHl7Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  availableIndents?: any[];
  activeWorkflow?: any;
  onSelectIndent?: (indent: any) => void;
}

export const OrderRecords: React.FC<OrderRecordsProps> = ({
  parsedOrder,
  fhirMedRequest,
  fhirMedDispense,
  fhirAuditEvent,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  availableIndents = [],
  activeWorkflow,
  onSelectIndent,
}) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'COLD_CHAIN' | 'AMBIENT' | 'SAFETY_HOLD' | 'DISPATCHED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'ROUTINE' | 'STAT' | 'URGENT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [activePayloadTab, setActivePayloadTab] = useState<'CLINICAL' | 'HL7' | 'FHIR'>('CLINICAL');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Combine live floor indents and attending EHR scenarios into a unified clinical order transmission ledger
  const unifiedOrderList = useMemo(() => {
    const records: any[] = [];
    const seenOrderKeys = new Set<string>();

    // 1. Process database indents first (real hospital records)
    for (const ind of availableIndents) {
      const isDoseMismatch = ind.requestedDose === '999' || ind.indentNumber.includes('WRONG-DOSE');
      const isMedMismatch = ind.indentNumber.includes('WRONG-MED');
      const isSafetyHold = isDoseMismatch || isMedMismatch;
      const orderNum = `ORD-2026-${ind.indentNumber.replace(/[^0-9]/g, '').slice(-4) || '9042'}`;
      const isSelected = parsedOrder.orc.placerOrderNumber === orderNum || parsedOrder.pid.patientId === ind.patientMrn;

      records.push({
        id: ind.id || ind.indentNumber,
        orderNumber: orderNum,
        indentNumber: ind.indentNumber,
        controlId: `MSG-${ind.indentNumber}`,
        patientName: ind.patientName || 'Warren, Elizabeth',
        patientMrn: ind.patientMrn || 'MRN-849201',
        drugName: ind.requestedDrugName,
        dosage: `${ind.requestedDose} ${ind.requestedUnits} ${ind.formulation || ''}`.trim(),
        route: ind.route || 'Subcutaneous',
        ward: ind.ward || 'Ward 4B',
        bed: ind.bed || 'Bed 12',
        priority: (ind.priority || 'ROUTINE') as 'ROUTINE' | 'STAT' | 'URGENT',
        coldChainRequired: ind.coldChainRequired !== false,
        doctorName: 'Dr. Robert Kaplan, MD (NPI 10842)',
        sendingApp: 'EPIC_EHR',
        sendingFacility: 'ST_JUDE_HOSPITAL',
        status: isSafetyHold
          ? 'SAFETY_HOLD'
          : ind.status === 'DISPATCHED' || (isSelected && activeWorkflow?.status === 'DISPATCHED')
          ? 'DISPATCHED'
          : 'VERIFIED',
        statusReason: isDoseMismatch
          ? 'Dose mismatch: 999 vs 100 UNIT'
          : isMedMismatch
          ? 'Drug mismatch: Trastuzumab ≠ Insulin Glargine'
          : null,
        source: 'INPATIENT_INDENT',
        rawIndent: ind,
        rawHl7: [
          `MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|MSG-${ind.indentNumber}|P|2.5`,
          `PID|1||${ind.patientMrn}^^^ST_JUDE^MR||${ind.patientName.replace(/,\s*/, '^')}||19780624|F`,
          `PV1|1|I|${ind.ward}^${ind.bed || 'BED-12'}||||10842^KAPLAN^ROBERT^M^^DR|||IPD`,
          `ORC|NW|${orderNum}|FIL-88192||CM||1^ROUTINE||20260916093000|10842^KAPLAN^ROBERT|||PHARMACY`,
          `RXO|274783^${ind.requestedDrugName.toUpperCase()}^RXNORM|${ind.requestedDose}|${ind.requestedUnits}||||||||SC`,
          `RXR|SC^SUBCUTANEOUS^HL70162`,
        ].join('\r') + '\r',
        isActiveInDispensary: isSelected,
      });

      seenOrderKeys.add(orderNum);
      seenOrderKeys.add(ind.indentNumber);
    }

    // 2. Supplement with attending EHR scenarios that are not yet covered
    scenarios.forEach((sc, idx) => {
      // Exclude malformed test frames from the clinical ledger
      if (sc.id === 'SCENARIO-INVALID-HL7') return;

      const orderNum = `ORD-2026-904${idx + 2}`;
      if (seenOrderKeys.has(orderNum)) return;

      const isSelected = sc.id === selectedScenarioId;
      const isOverdose = sc.id === 'SCENARIO-DOSE-MISMATCH';
      const isWrongMed = sc.id === 'SCENARIO-WRONG-MED';
      const isSafetyHold = isOverdose || isWrongMed;

      records.push({
        id: sc.id,
        orderNumber: isSelected ? parsedOrder.orc.placerOrderNumber : orderNum,
        indentNumber: `IND-2026-904${idx + 2}`,
        controlId: isSelected ? parsedOrder.msh.controlId : `MSG2026091600${idx + 1}`,
        patientName: isSelected
          ? parsedOrder.pid.patientName
          : idx === 1
          ? 'Patel, Ananya S.'
          : idx === 2
          ? "O'Connor, Liam P."
          : idx === 3
          ? 'Miller, David R.'
          : 'Warren, Elizabeth M.',
        patientMrn: isSelected
          ? parsedOrder.pid.patientId
          : idx === 1
          ? 'MRN-392019'
          : idx === 2
          ? 'MRN-720194'
          : idx === 3
          ? 'MRN-551920'
          : 'MRN-849201',
        drugName: sc.drugName,
        dosage: sc.dosage,
        route: sc.dosage.includes('IV') ? 'Intravenous' : sc.dosage.includes('Oral') ? 'Oral' : 'Subcutaneous',
        ward: sc.ward,
        bed: idx === 1 ? 'Bed 03' : idx === 2 ? 'Bed 08' : idx === 3 ? 'Bed 22' : 'Bed 12',
        priority: sc.priority,
        coldChainRequired: sc.coldChainRequired,
        doctorName: idx === 1 ? 'Dr. Lisa Chen, MD (NPI 11499)' : 'Dr. Robert Kaplan, MD (NPI 10842)',
        sendingApp: idx === 1 ? 'CERNER_EHR' : 'EPIC_EHR',
        sendingFacility: idx === 1 ? 'MEMORIAL_SLOAN' : 'ST_JUDE_HOSPITAL',
        status: isSafetyHold
          ? 'SAFETY_HOLD'
          : isSelected && activeWorkflow?.status === 'DISPATCHED'
          ? 'DISPATCHED'
          : 'VERIFIED',
        statusReason: isOverdose
          ? 'Dose Mismatch: 999 UNIT exceeds prescribed clinical protocol'
          : isWrongMed
          ? 'Medication Concept Mismatch: Trastuzumab ordered vs Insulin'
          : null,
        source: 'EHR_SCENARIO',
        rawHl7: sc.rawMessage,
        isActiveInDispensary: isSelected,
      });
    });

    return records;
  }, [availableIndents, scenarios, selectedScenarioId, parsedOrder, activeWorkflow]);

  // Dynamic KPI Metrics
  const kpiMetrics = useMemo(() => {
    const totalOrders = unifiedOrderList.length;
    const coldChainCount = unifiedOrderList.filter((o) => o.coldChainRequired).length;
    const safetyHoldCount = unifiedOrderList.filter((o) => o.status === 'SAFETY_HOLD').length;
    const dispatchedCount = unifiedOrderList.filter((o) => o.status === 'DISPATCHED').length;

    return { totalOrders, coldChainCount, safetyHoldCount, dispatchedCount };
  }, [unifiedOrderList]);

  // Filtered orders based on category, priority, and search query
  const filteredOrders = useMemo(() => {
    return unifiedOrderList.filter((item) => {
      // Category filter
      if (categoryFilter === 'COLD_CHAIN' && !item.coldChainRequired) return false;
      if (categoryFilter === 'AMBIENT' && item.coldChainRequired) return false;
      if (categoryFilter === 'SAFETY_HOLD' && item.status !== 'SAFETY_HOLD') return false;
      if (categoryFilter === 'DISPATCHED' && item.status !== 'DISPATCHED') return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.orderNumber.toLowerCase().includes(q) ||
          item.patientName.toLowerCase().includes(q) ||
          item.patientMrn.toLowerCase().includes(q) ||
          item.drugName.toLowerCase().includes(q) ||
          item.ward.toLowerCase().includes(q) ||
          item.doctorName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedOrderList, categoryFilter, priorityFilter, searchQuery]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleLoadAndNavigateToDispensary = (order: any) => {
    if (order.source === 'INPATIENT_INDENT' && order.rawIndent && onSelectIndent) {
      onSelectIndent(order.rawIndent);
    } else if (order.source === 'EHR_SCENARIO') {
      onSelectScenario(order.id);
    } else if (onSelectIndent && order.rawIndent) {
      onSelectIndent(order.rawIndent);
    } else {
      onSelectScenario(order.id);
    }
    navigate('/dispensary');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1180px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. Header Card */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Medication Orders
              </h1>
              <span className="badge badge-green" style={{ fontSize: '0.7rem', gap: '0.25rem', fontWeight: 600 }}>
                <ShieldCheck size={12} /> EHR Connected
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
              All medication orders and prescriptions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #dcfce7' }}>
            <CheckCircle2 size={14} /> EHR Online
          </span>
          <span style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, backgroundColor: '#f0f9ff', padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
            <ThermometerSnowflake size={14} /> Cold-Chain Active
          </span>
        </div>
      </div>

      {/* 2. 4 Hospital-Grade KPI Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem' }}>
        {/* Metric 1 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Orders
            </span>
            <span style={{ color: '#0284c7', backgroundColor: '#f0f9ff', padding: '0.25rem', borderRadius: '4px' }}>
              <FileText size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginTop: '0.3rem' }}>
            {kpiMetrics.totalOrders} Orders
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Live data
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cold-Chain
            </span>
            <span style={{ color: '#0284c7', backgroundColor: '#e0f2fe', padding: '0.25rem', borderRadius: '4px' }}>
              <ThermometerSnowflake size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0284c7', marginTop: '0.3rem' }}>
            {kpiMetrics.coldChainCount} Biologics
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
            Needs refrigeration
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Safety Holds
            </span>
            <span style={{ color: '#d97706', backgroundColor: '#fef3c7', padding: '0.25rem', borderRadius: '4px' }}>
              <AlertTriangle size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: kpiMetrics.safetyHoldCount > 0 ? '#b45309' : '#16a34a', marginTop: '0.3rem' }}>
            {kpiMetrics.safetyHoldCount} Safety Holds
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
            Blocked for review
          </div>
        </div>

        {/* Metric 4 */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dispatched
            </span>
            <span style={{ color: '#16a34a', backgroundColor: '#f0fdf4', padding: '0.25rem', borderRadius: '4px' }}>
              <Send size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#16a34a', marginTop: '0.3rem' }}>
            {kpiMetrics.dispatchedCount} In-Transit
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
            In transit
          </div>
        </div>
      </div>

      {/* 3. Main Order Transmissions Ledger Table */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        {/* Top Control Bar: Category Tabs & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Orders (${unifiedOrderList.length})` },
              { id: 'COLD_CHAIN', label: `Cold-Chain (${kpiMetrics.coldChainCount})` },
              { id: 'AMBIENT', label: `Ambient (${unifiedOrderList.length - kpiMetrics.coldChainCount})` },
              { id: 'SAFETY_HOLD', label: `Safety Holds (${kpiMetrics.safetyHoldCount})` },
              { id: 'DISPATCHED', label: `Dispatched (${kpiMetrics.dispatchedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCategoryFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.74rem',
                  fontWeight: categoryFilter === tab.id ? 700 : 500,
                  borderRadius: '6px',
                  border: categoryFilter === tab.id ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: categoryFilter === tab.id ? '#f0f9ff' : '#ffffff',
                  color: categoryFilter === tab.id ? '#0284c7' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Priority Selector */}
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
              {(['ALL', 'ROUTINE', 'URGENT', 'STAT'] as const).map((prio) => (
                <button
                  key={prio}
                  onClick={() => {
                    setPriorityFilter(prio);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: priorityFilter === prio ? '#ffffff' : 'transparent',
                    color: priorityFilter === prio ? '#0284c7' : '#64748b',
                    boxShadow: priorityFilter === prio ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {prio}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patient, MRN, drug..."
                style={{
                  padding: '0.35rem 0.75rem 0.35rem 1.8rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  width: '210px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Order Reference</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Patient Name &amp; MRN</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Prescribed Medication</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Location</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Storage</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.75rem 0.85rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5, display: 'block' }} />
                    No medication orders found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  return (
                    <tr
                      key={ord.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: ord.isActiveInDispensary ? '#f0f9ff' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Order Reference */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#0f172a' }}>
                            {ord.orderNumber}
                          </span>
                          {ord.isActiveInDispensary && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          {ord.priority} &middot; {ord.sendingApp}
                        </div>
                      </td>

                      {/* Patient Name & MRN */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {ord.patientName}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.1rem' }}>
                          {ord.patientMrn}
                        </div>
                      </td>

                      {/* Prescribed Medication */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {ord.drugName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>
                          {ord.dosage} &middot; <span style={{ color: '#64748b' }}>{ord.route}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ color: '#334155', fontWeight: 500 }}>
                          {ord.ward}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {ord.bed}
                        </div>
                      </td>

                      {/* Storage */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        {ord.coldChainRequired ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ThermometerSnowflake size={12} /> 2°C–8°C Cold-Chain
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building2 size={12} /> Ambient (USP)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        {ord.status === 'SAFETY_HOLD' ? (
                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <AlertTriangle size={11} /> Safety Hold
                            </span>
                            {ord.statusReason && (
                              <div style={{ fontSize: '0.64rem', color: '#991b1b', marginTop: '0.15rem', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ord.statusReason}>
                                {ord.statusReason}
                              </div>
                            )}
                          </div>
                        ) : ord.status === 'DISPATCHED' ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Send size={11} /> Dispatched
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="btn btn-outline"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', gap: '0.25rem', backgroundColor: '#ffffff' }}
                            title="Inspect order details and HL7/FHIR payloads"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                          <button
                            onClick={() => handleLoadAndNavigateToDispensary(ord)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', gap: '0.3rem' }}
                            title="Open order in Central Dispensary Workstation"
                          >
                            Dispensary <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Showing <strong>{filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong>–<strong>{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> medication orders
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Focused Clinical & Interoperability Inspection Modal */}
      {selectedOrderDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    Order Inspection: {selectedOrderDetails.orderNumber}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Pt: {selectedOrderDetails.patientName} &middot; {selectedOrderDetails.patientMrn} &middot; {selectedOrderDetails.ward}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Payload Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                padding: '0 1.25rem',
              }}
            >
              <button
                onClick={() => setActivePayloadTab('CLINICAL')}
                style={{
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activePayloadTab === 'CLINICAL' ? '2px solid #0284c7' : '2px solid transparent',
                  color: activePayloadTab === 'CLINICAL' ? '#0284c7' : '#64748b',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                Clinical Overview
              </button>
              <button
                onClick={() => setActivePayloadTab('HL7')}
                style={{
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activePayloadTab === 'HL7' ? '2px solid #0284c7' : '2px solid transparent',
                  color: activePayloadTab === 'HL7' ? '#0284c7' : '#64748b',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                HL7 v2.5 OMP^O09 Segments
              </button>
              <button
                onClick={() => setActivePayloadTab('FHIR')}
                style={{
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activePayloadTab === 'FHIR' ? '2px solid #0284c7' : '2px solid transparent',
                  color: activePayloadTab === 'FHIR' ? '#0284c7' : '#64748b',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                HL7 FHIR R4 JSON Resource
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {activePayloadTab === 'CLINICAL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Top Banner Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        Prescribed Medication
                      </div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                        {selectedOrderDetails.drugName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.15rem' }}>
                        Dosage: <strong>{selectedOrderDetails.dosage}</strong>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem' }}>
                        Route: <strong>{selectedOrderDetails.route}</strong>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        Cold-Chain Storage Constraint
                      </div>
                      {selectedOrderDetails.coldChainRequired ? (
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0284c7', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <ThermometerSnowflake size={16} /> 2°C – 8°C Refrigerated
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#475569', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building2 size={16} /> USP Ambient Storage
                        </div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.15rem' }}>
                        Drop Zone: <strong>{selectedOrderDetails.ward} - Med Fridge Lockbox A</strong>
                      </div>
                    </div>
                  </div>

                  {/* Safety Status Banner */}
                  {selectedOrderDetails.status === 'SAFETY_HOLD' ? (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                          Clinical Safety Hold Engaged
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: '0.15rem' }}>
                          {selectedOrderDetails.statusReason || 'Discrepancy detected between EHR prescription and bedside indent. Dispensary fulfillment is blocked until clinical review.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                          Clinical Concordance Passed
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#15803d', marginTop: '0.1rem' }}>
                          Drug formulation, dose, patient identity, and subcutaneous route match across EHR and bedside indent.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Ordering Physician</span>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '0.15rem', display: 'block' }}>{selectedOrderDetails.doctorName}</strong>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Sending Gateway</span>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '0.15rem', display: 'block' }}>{selectedOrderDetails.sendingApp} ({selectedOrderDetails.sendingFacility})</strong>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Fulfillment State</span>
                      <span className={`badge ${selectedOrderDetails.status === 'DISPATCHED' ? 'badge-green' : selectedOrderDetails.status === 'SAFETY_HOLD' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>
                        {selectedOrderDetails.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activePayloadTab === 'HL7' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      HL7 v2.5 OMP^O09 Pharmacy Order Segments
                    </span>
                    <button
                      onClick={() => handleCopyPayload(selectedOrderDetails.rawHl7)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', gap: '0.25rem' }}
                    >
                      <Copy size={11} /> {copiedNotification ? 'Copied!' : 'Copy HL7'}
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.76rem',
                      lineHeight: 1.6,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      overflowX: 'auto',
                    }}
                  >
                    {selectedOrderDetails.rawHl7.trim().split(/\r\n|\r|\n/).map((line: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          whiteSpace: 'pre',
                          color: line.startsWith('MSH') ? '#0284c7' : line.startsWith('RXO') ? '#16a34a' : line.startsWith('PID') ? '#9333ea' : '#334155',
                          fontWeight: line.startsWith('MSH') || line.startsWith('RXO') ? 600 : 400,
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePayloadTab === 'FHIR' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      HL7 FHIR R4 MedicationRequest Resource (HAPI FHIR Synchronized)
                    </span>
                    <button
                      onClick={() => handleCopyPayload(JSON.stringify(fhirMedRequest, null, 2))}
                      className="btn btn-outline"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', gap: '0.25rem' }}
                    >
                      <Copy size={11} /> {copiedNotification ? 'Copied!' : 'Copy FHIR JSON'}
                    </button>
                  </div>
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      overflowX: 'auto',
                      maxHeight: '350px',
                      color: '#1e293b',
                    }}
                  >
                    {JSON.stringify(fhirMedRequest, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.78rem' }}
              >
                Close
              </button>

              <button
                onClick={() => {
                  handleLoadAndNavigateToDispensary(selectedOrderDetails);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', gap: '0.35rem' }}
              >
                Open in Central Dispensary <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
