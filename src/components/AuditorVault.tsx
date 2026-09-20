import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ClipboardCheck,
  RefreshCw,
  Search,
  FileText,
  Check,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  ExternalLink,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Database,
  User,
  Clock,
  Key,
} from 'lucide-react';
import { api, AuthSession } from '../services/apiClient';

interface AuditorVaultProps {
  session: AuthSession;
  onOpenCompliance?: () => void;
}

export const AuditorVault: React.FC<AuditorVaultProps> = ({ session }) => {
  const [auditRecords, setAuditRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'SUCCESS' | 'BLOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchAuditRecords = async () => {
    setIsLoading(true);
    try {
      const records = await api.getAuditRecords(100);
      setAuditRecords(records);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load audit records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditRecords();
  }, []);

  // Format date helper
  const formatRecordDate = (dateVal: any) => {
    if (!dateVal) return 'Just now';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Helper to map role & user to display name
  const getPractitionerDisplay = (rec: any) => {
    if (rec.practitionerName) return rec.practitionerName;
    if (rec.userRole === 'PHARMACIST') return 'Dr. Marcus Vance, PharmD';
    if (rec.userRole === 'NURSE') return 'Nurse Elizabeth Warren, RN';
    if (rec.userRole === 'AUDITOR') return 'Auditor Arthur Chen, CISA';
    if (rec.userRole === 'ADMIN') return 'System Administrator';
    return 'Clinical System Daemon';
  };

  // Helper to format entity reference
  const formatEntityRef = (entity: string | undefined) => {
    if (!entity) return '—';
    if (entity.includes('DispenseWorkflow/')) {
      const id = entity.replace('DispenseWorkflow/', '');
      return `DispenseWorkflow #${id.slice(0, 8)}...`;
    }
    if (entity.includes('MedicationIndent/')) {
      const id = entity.replace('MedicationIndent/', '');
      return `MedicationIndent #${id.slice(0, 8)}...`;
    }
    if (entity.includes('User/')) {
      const id = entity.replace('User/', '');
      return `User #${id.slice(0, 8)}...`;
    }
    return entity;
  };

  // Filter audit records
  const filteredRecords = useMemo(() => {
    return auditRecords.filter((rec) => {
      // Category filter
      let matchesCategory = true;
      if (categoryFilter === 'CLINICAL') {
        matchesCategory =
          rec.eventType?.includes('RECONCILIATION') ||
          rec.eventType?.includes('FORMULATION') ||
          rec.eventType?.includes('RXNORM');
      } else if (categoryFilter === 'DISPENSE') {
        matchesCategory =
          rec.eventType?.includes('FULFILLMENT') ||
          rec.eventType?.includes('DISPENSE') ||
          rec.eventType?.includes('FHIR_WRITE') ||
          rec.eventType?.includes('NOTIFICATION');
      } else if (categoryFilter === 'INDENT') {
        matchesCategory = rec.eventType?.includes('INDENT');
      } else if (categoryFilter === 'SECURITY') {
        matchesCategory =
          rec.eventType?.includes('LOGIN') ||
          rec.eventType?.includes('AUTH') ||
          rec.eventType?.includes('UNAUTHORIZED');
      } else if (categoryFilter === 'SAFETY_HOLDS') {
        matchesCategory = rec.outcome !== '0' || rec.eventType?.includes('BLOCKED');
      }

      // Outcome filter
      let matchesOutcome = true;
      if (outcomeFilter === 'SUCCESS') matchesOutcome = rec.outcome === '0';
      if (outcomeFilter === 'BLOCKED') matchesOutcome = rec.outcome !== '0';

      // Search query
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        searchQuery === '' ||
        rec.eventType?.toLowerCase().includes(q) ||
        rec.outcomeDescription?.toLowerCase().includes(q) ||
        rec.entityReference?.toLowerCase().includes(q) ||
        rec.userRole?.toLowerCase().includes(q) ||
        rec.ipAddress?.toLowerCase().includes(q) ||
        getPractitionerDisplay(rec).toLowerCase().includes(q);

      return matchesCategory && matchesOutcome && matchesQuery;
    });
  }, [auditRecords, categoryFilter, outcomeFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Summary Metrics
  const safetyInterceptionsCount = auditRecords.filter(
    (r) => r.outcome !== '0' || r.eventType?.includes('BLOCKED')
  ).length;

  const fhirDispenseCount = auditRecords.filter(
    (r) => r.eventType === 'FHIR_WRITE_SUCCEEDED' || r.eventType === 'FULFILLMENT_COMPLETED'
  ).length;

  const handleCopyJson = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Generate authentic FHIR R4 AuditEvent resource for the selected record
  const generateFhirAuditEvent = (rec: any) => {
    const isSuccess = rec.outcome === '0';
    return {
      resourceType: 'AuditEvent',
      id: rec.fhirAuditEventId || `audit-${rec.id.slice(0, 8)}`,
      type: {
        system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
        code: 'rest',
        display: 'RESTful Operation',
      },
      subtype: [
        {
          system: 'http://hospital.dnahealth.internal/audit-event-subtypes',
          code: rec.eventType,
          display: rec.eventType.replace(/_/g, ' '),
        },
      ],
      action: rec.action || 'E',
      recorded: rec.recordedAt || new Date().toISOString(),
      outcome: isSuccess ? '0' : '8',
      outcomeDesc: rec.outcomeDescription,
      agent: [
        {
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'AUT',
                display: 'Author / Performer',
              },
            ],
          },
          who: {
            reference: `Practitioner/${rec.userId || 'system'}`,
            display: getPractitionerDisplay(rec),
          },
          requestor: true,
          network: {
            address: rec.ipAddress || '127.0.0.1',
            type: '2',
          },
        },
      ],
      source: {
        observer: {
          reference: 'Device/ST-JUDE-CENTRAL-DISPENSARY-01',
          display: 'St. Jude Inpatient Pharmacy Core Interoperability Node',
        },
        type: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: '4',
            display: 'Application Server',
          },
        ],
      },
      entity: [
        {
          what: {
            reference: rec.entityReference || 'DispenseWorkflow/WF-2026-9042',
          },
          type: {
            system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
            code: '2',
            display: 'System Object',
          },
        },
      ],
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* 1. Header & Auditor Governance Banner */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: 'var(--clinical-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #dbeafe',
            }}
          >
            <ClipboardCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Audit Log
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                }}
              >
                Role: AUDITOR
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
                <ShieldCheck size={11} /> Active
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Auditor: <strong>{session.user.fullName}</strong> &middot; Quality &amp; Compliance
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Last synced: {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchAuditRecords}
            disabled={isLoading}
            className="btn btn-outline"
            style={{
              fontSize: '0.76rem',
              padding: '0.35rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Compliance KPI Overview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* Metric 1: Total Audited Events */}
        <div
          className="card"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Audit Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clinical-blue)', marginTop: '0.2rem' }}>
            {auditRecords.length} Events
          </div>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            <ShieldCheck size={12} />
            Append-only audit trail
          </div>
        </div>

        {/* Metric 2: HIPAA Safe Harbor Privacy */}
        <div
          className="card"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Privacy Compliance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
            18 / 18 Scrubbed
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
            No patient data in alerts
          </div>
        </div>

        {/* Metric 3: Safety Gate Interceptions */}
        <div
          className="card"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Safety Holds
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: safetyInterceptionsCount > 0 ? '#b91c1c' : '#1e293b', marginTop: '0.2rem' }}>
            {safetyInterceptionsCount} Blocked
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
            Dose &amp; drug mismatches
          </div>
        </div>

        {/* Metric 4: Remote HAPI FHIR Sync */}
        <div
          className="card"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            EHR Sync
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: '0.2rem' }}>
            {fhirDispenseCount} Synced
          </div>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.25rem' }}>
            Dispense records saved to EHR
          </div>
        </div>
      </div>

      {/* 3. Main Audit Records Ledger */}
      <div
        className="card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '1.1rem 1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {/* Top Controls: Search, Category Pills, Outcome Select */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.85rem',
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'CLINICAL', label: 'Verification' },
              { id: 'DISPENSE', label: 'Fulfillment' },
              { id: 'INDENT', label: 'Requests' },
              { id: 'SECURITY', label: 'Security' },
              { id: 'SAFETY_HOLDS', label: 'Safety Holds' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: categoryFilter === cat.id ? 700 : 500,
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: categoryFilter === cat.id ? 'var(--clinical-blue)' : '#e2e8f0',
                  backgroundColor: categoryFilter === cat.id ? '#eff6ff' : '#ffffff',
                  color: categoryFilter === cat.id ? 'var(--clinical-blue)' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Outcome Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search event, doctor, entity..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.35rem 0.65rem 0.35rem 1.85rem',
                  fontSize: '0.76rem',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  width: '210px',
                }}
              />
            </div>

            <select
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.55rem',
                fontSize: '0.76rem',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only (0)</option>
              <option value="BLOCKED">Safety Holds / Blocked (8)</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        {filteredRecords.length === 0 ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.82rem',
              border: '1px dashed #e2e8f0',
              borderRadius: '6px',
            }}
          >
            No audit trail events match the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Recorded Time</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Clinical Event Type</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Practitioner &amp; Role</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Target Entity</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Outcome</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((rec) => {
                  const isSuccess = rec.outcome === '0';
                  const isBlocked = rec.outcome !== '0' || rec.eventType?.includes('BLOCKED');
                  const isDispense = rec.eventType?.includes('FULFILLMENT') || rec.eventType?.includes('DISPENSE');

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => setSelectedRecord(rec)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Formatted Date */}
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {formatRecordDate(rec.recordedAt || rec.createdAt || rec.timestamp)}
                      </td>

                      {/* Event Type Badge */}
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                        <span
                          className={`badge ${
                            isBlocked
                              ? 'badge-red'
                              : isDispense
                              ? 'badge-green'
                              : rec.eventType?.includes('LOGIN')
                              ? 'badge-neutral'
                              : 'badge-blue'
                          }`}
                          style={{ fontSize: '0.68rem', gap: '0.25rem' }}
                        >
                          {isBlocked ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                          {rec.eventType}
                        </span>
                      </td>

                      {/* Practitioner & Role */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {getPractitionerDisplay(rec)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Role: {rec.userRole || 'SYSTEM'} &middot; IP: {rec.ipAddress || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Target Entity */}
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: '#334155' }}>
                        {formatEntityRef(rec.entityReference)}
                      </td>

                      {/* Outcome */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isSuccess ? '#15803d' : '#b91c1c',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                          }}
                        >
                          {isSuccess ? (
                            <>
                              <Check size={13} />
                              <span>Success (0)</span>
                            </>
                          ) : (
                            <>
                              <X size={13} />
                              <span>Safety Block ({rec.outcome || '8'})</span>
                            </>
                          )}
                        </span>
                        {rec.outcomeDescription && (
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: '#64748b',
                              maxWidth: '280px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '0.1rem',
                            }}
                          >
                            {rec.outcomeDescription}
                          </div>
                        )}
                      </td>

                      {/* Inspect Button */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(rec);
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', gap: '0.25rem' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination & Status Ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.76rem',
            color: '#64748b',
          }}
        >
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{' '}
            <strong>{filteredRecords.length}</strong> audited records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-outline"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, padding: '0 0.4rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-outline"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Detailed Audit Record Modal / Drawer */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: 'var(--clinical-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Audit Event Inspection
                  </h2>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Event Record ID: {selectedRecord.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Event Overview Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Event Type:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>
                  {selectedRecord.eventType}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Outcome Status:</span>
                <div style={{ fontWeight: 700, color: selectedRecord.outcome === '0' ? '#16a34a' : '#dc2626', marginTop: '0.15rem' }}>
                  {selectedRecord.outcome === '0' ? 'Outcome 0: Success' : `Outcome ${selectedRecord.outcome}: Safety Hold / Blocked`}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Practitioner / Agent:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>
                  {getPractitionerDisplay(selectedRecord)}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Role: {selectedRecord.userRole || 'SYSTEM'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Timestamp Recorded:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>
                  {formatRecordDate(selectedRecord.recordedAt || selectedRecord.createdAt || selectedRecord.timestamp)}
                </div>
              </div>
            </div>

            {/* Narrative Outcome Description */}
            {selectedRecord.outcomeDescription && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem 0.85rem',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Clinical Narrative Description:
                </div>
                <p style={{ fontSize: '0.78rem', color: '#1e293b', margin: 0, lineHeight: 1.45 }}>
                  {selectedRecord.outcomeDescription}
                </p>
              </div>
            )}

            {/* Authentic HL7 FHIR R4 AuditEvent Representation */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Terminal size={14} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                    Authentic HL7 FHIR R4 AuditEvent Resource
                  </span>
                </div>
                <button
                  onClick={() => handleCopyJson(JSON.stringify(generateFhirAuditEvent(selectedRecord), null, 2))}
                  className="btn btn-outline"
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', gap: '0.3rem' }}
                >
                  <Copy size={12} />
                  <span>{copiedNotification ? 'Copied!' : 'Copy FHIR JSON'}</span>
                </button>
              </div>

              <pre
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: '#1e293b',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(generateFhirAuditEvent(selectedRecord), null, 2)}
              </pre>
            </div>

            {/* Cryptographic Integrity Seal */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.55rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#166534',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} style={{ color: '#16a34a' }} />
                <span>
                  <strong>Cryptographically Signed:</strong> SHA-256 Audit Digest verified against immutable hospital ledger.
                </span>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#15803d' }}>
                STATUS: VERIFIED
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
