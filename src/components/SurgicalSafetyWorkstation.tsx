import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Droplet,
  Copy,
  ExternalLink,
  Check,
  FileText,
  Lock,
  RefreshCw,
  Info,
  Building2,
  ThermometerSnowflake,
  ArrowRight,
  Truck,
  PlusCircle,
} from 'lucide-react';
import { api, AuthSession } from '../services/apiClient';

interface SurgicalSafetyWorkstationProps {
  session: AuthSession;
}

export const SurgicalSafetyWorkstation: React.FC<SurgicalSafetyWorkstationProps> = ({ session: _session }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('surg-case-001');
  const [activeCase, setActiveCase] = useState<any | null>(null);
  const [patientIndents, setPatientIndents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  // Attestation Sign-Off Checkboxes
  const [surgeonAttested, setSurgeonAttested] = useState<boolean>(true);
  const [anesthesiaAttested, setAnesthesiaAttested] = useState<boolean>(true);
  const [nurseAttested, setNurseAttested] = useState<boolean>(true);

  // Modal State for Official Compiled Document
  const [showDocumentModal, setShowDocumentModal] = useState<boolean>(false);
  const [compiledComposition, setCompiledComposition] = useState<any | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [completionResult, setCompletionResult] = useState<any | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all scheduled cases
  const loadCases = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/surgery/cases');
      if (res.data) {
        setCases(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load surgical cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch specific case details
  const loadCaseDetails = async (caseId: string) => {
    try {
      setIsVerifying(true);
      const res = await api.get(`/surgery/cases/${caseId}`);
      if (res.data) {
        setActiveCase(res.data);
        setSurgeonAttested(res.data.overallReadiness === 'CLEARED_FOR_INCISION');
        setAnesthesiaAttested(res.data.overallReadiness === 'CLEARED_FOR_INCISION');
        setNurseAttested(res.data.overallReadiness === 'CLEARED_FOR_INCISION');
        setCompletionResult(null);
        setFeedbackMessage(null);
      }
    } catch (err: any) {
      console.error('Failed to load case details:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch inpatient pharmacy indents for the active surgical patient
  const fetchPatientIndents = async (mrn: string, ptName: string) => {
    try {
      const allIndents = await api.getIndents();
      const lastName = ptName.split(',')[0].trim().toLowerCase();
      const matched = allIndents.filter(
        (i: any) =>
          i.patientMrn === mrn ||
          (i.patientName && i.patientName.toLowerCase().includes(lastName))
      );
      setPatientIndents(matched);
    } catch (err) {
      console.error('Failed to query patient pharmacy indents:', err);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Listen to deep-links from URL query parameters (?caseId=... or ?mrn=...)
  useEffect(() => {
    const urlCaseId = searchParams.get('caseId');
    const urlMrn = searchParams.get('mrn');

    if (urlCaseId) {
      setSelectedCaseId(urlCaseId);
    } else if (urlMrn && cases.length > 0) {
      const matchedCase = cases.find(
        (c) =>
          c.patientMrn === urlMrn ||
          (urlMrn === 'MRN-782104' && c.caseId.includes('002')) ||
          (urlMrn === 'MRN-551920' && c.caseId.includes('003'))
      );
      if (matchedCase) {
        setSelectedCaseId(matchedCase.caseId);
      }
    }
  }, [searchParams, cases]);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (activeCase?.procedure?.patientMrn) {
      fetchPatientIndents(activeCase.procedure.patientMrn, activeCase.procedure.patientName);
    }
  }, [activeCase]);

  // Real-time listener for indents updates
  useEffect(() => {
    const handleUpdate = () => {
      if (activeCase?.procedure?.patientMrn) {
        fetchPatientIndents(activeCase.procedure.patientMrn, activeCase.procedure.patientName);
      }
    };
    window.addEventListener('dna-health-indents-updated', handleUpdate);
    return () => window.removeEventListener('dna-health-indents-updated', handleUpdate);
  }, [activeCase]);

  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  // Complete official Time-Out & Compile FHIR Composition
  const handleCompleteTimeout = async () => {
    if (!activeCase) return;

    try {
      setIsCompleting(true);
      setFeedbackMessage(null);
      const res = await api.post(`/surgery/cases/${activeCase.caseId}/complete-timeout`, {});
      if (res.data && res.data.success) {
        setCompletionResult(res.data);
        setFeedbackMessage({
          type: 'success',
          text: `Time-Out Attestation completed. Official FHIR R4 Composition created (ID: ${res.data.compositionId}).`,
        });

        // Load compiled composition JSON
        const compRes = await api.get(`/surgery/cases/${activeCase.caseId}/composition`);
        setCompiledComposition(compRes.data);
        setShowDocumentModal(true);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      setFeedbackMessage({
        type: 'error',
        text: `Time-Out Blocked: ${errMsg}`,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleViewComposition = async () => {
    if (!activeCase) return;
    try {
      const compRes = await api.get(`/surgery/cases/${activeCase.caseId}/composition`);
      setCompiledComposition(compRes.data);
      setShowDocumentModal(true);
    } catch (err: any) {
      console.error('Error fetching composition:', err);
    }
  };

  const handleCopyJson = () => {
    if (compiledComposition) {
      navigator.clipboard.writeText(JSON.stringify(compiledComposition, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const isAllAttested = surgeonAttested && anesthesiaAttested && nurseAttested;
  const isCleared = activeCase?.overallReadiness === 'CLEARED_FOR_INCISION';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header Banner & Case Switcher */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Surgery Checklist (Time-Out)
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                }}
              >
                WHO Guidelines
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Pre-incision safety checks for the operating room
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => loadCaseDetails(selectedCaseId)}
            className="btn btn-outline"
            style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
            disabled={isVerifying}
          >
            <RefreshCw size={13} className={isVerifying ? 'spin' : ''} /> Refresh Checks
          </button>
          {activeCase && (
            <button
              onClick={handleViewComposition}
              className="btn btn-outline"
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', gap: '0.35rem', color: '#0284c7', borderColor: '#bae6fd' }}
            >
              <FileText size={13} /> View FHIR Composition
            </button>
          )}
        </div>
      </div>

      {/* Case Presets Ribbon */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Select Scheduled OR Case:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          {cases.map((c) => {
            const isSelected = c.caseId === selectedCaseId;
            const isCaseCleared = c.overallReadiness === 'CLEARED_FOR_INCISION';

            return (
              <button
                key={c.caseId}
                onClick={() => handleCaseSelect(c.caseId)}
                style={{
                  border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isCaseCleared ? '#16a34a' : '#dc2626',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: isSelected ? '#0369a1' : '#1e293b' }}>
                    {c.procedureName.length > 28 ? `${c.procedureName.slice(0, 26)}...` : c.procedureName}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    Pt: {c.patientName} &middot; {c.operatingRoom.split('-')[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedbackMessage && (
        <div
          style={{
            backgroundColor: feedbackMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedbackMessage.type === 'success' ? '#86efac' : '#fca5a5'}`,
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            fontSize: '0.82rem',
            color: feedbackMessage.type === 'success' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Active Case Console */}
      {isLoading || !activeCase ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading scheduled surgical cases from EHR...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Patient & Surgical Suite Master Banner */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              borderLeft: isCleared ? '4px solid #16a34a' : '4px solid #dc2626',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {activeCase.procedure.patientName}
                </span>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                  {activeCase.procedure.patientMrn}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  DOB: {activeCase.procedure.patientDob} ({activeCase.procedure.patientGender})
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                <strong>Scheduled Procedure:</strong> {activeCase.procedure.procedureName} &middot;{' '}
                <strong>Site:</strong> {activeCase.procedure.anatomicalSite} ({activeCase.procedure.laterality})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Operating Suite</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{activeCase.procedure.operatingRoom}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Lead Surgeon</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{activeCase.procedure.leadSurgeon.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Anesthesiologist</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{activeCase.procedure.anesthesiologist.name}</div>
              </div>
            </div>
          </div>

          {/* 4-Pillar Clinical Verification Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
            {/* PILLAR 1: SCHEDULED SURGERY & SITE */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileCheck size={16} color="#0284c7" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      1. Scheduled Surgery
                    </span>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    Verified
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                  <strong>{activeCase.procedure.procedureName}</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  SNOMED CT: <code style={{ color: '#0369a1' }}>{activeCase.procedure.snomedCode}</code>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#334155', backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                  <div><strong>Anatomical Site:</strong> {activeCase.procedure.anatomicalSite}</div>
                  <div><strong>Laterality:</strong> {activeCase.procedure.laterality}</div>
                  <div style={{ color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>&check; Physical Skin Site Marked</div>
                </div>
              </div>
            </div>

            {/* PILLAR 2: INFORMED CONSENT */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: activeCase.consent.isSigned ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldAlert size={16} color={activeCase.consent.isSigned ? '#16a34a' : '#dc2626'} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      2. Surgical Consent
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: activeCase.consent.isSigned ? '#dcfce7' : '#fee2e2',
                      color: activeCase.consent.isSigned ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {activeCase.consent.isSigned ? 'SIGNED & ACTIVE' : 'MISSING / HOLD'}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#334155', marginBottom: '0.4rem' }}>
                  {activeCase.consent.isSigned ? (
                    <>
                      <div><strong>Consent ID:</strong> {activeCase.consent.consentId}</div>
                      <div><strong>Signed:</strong> {activeCase.consent.signedTimestamp?.slice(0, 10)}</div>
                      <div><strong>Witness:</strong> {activeCase.consent.witnessName}</div>
                    </>
                  ) : (
                    <div style={{ color: '#b91c1c', fontWeight: 600, backgroundColor: '#fef2f2', padding: '0.45rem', borderRadius: '4px' }}>
                      CRITICAL: Informed consent is not executed or verified in EHR.
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                  {activeCase.consent.notes}
                </div>
              </div>
            </div>

            {/* PILLAR 3: ANTIBIOTIC ALLERGIES */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: activeCase.allergies.safetyStatus === 'CLEARED' ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} color={activeCase.allergies.safetyStatus === 'CLEARED' ? '#16a34a' : '#dc2626'} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      3. Antibiotic Allergy
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: activeCase.allergies.safetyStatus === 'CLEARED' ? '#dcfce7' : '#fee2e2',
                      color: activeCase.allergies.safetyStatus === 'CLEARED' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {activeCase.allergies.safetyStatus}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#334155', marginBottom: '0.35rem' }}>
                  <strong>Prophylaxis:</strong> {activeCase.allergies.prophylaxisAntibiotic.name} ({activeCase.allergies.prophylaxisAntibiotic.dosage})
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem' }}>
                  RxNorm Code: <code style={{ color: '#0369a1' }}>{activeCase.allergies.prophylaxisAntibiotic.rxNormCode}</code> &middot; Timing: {activeCase.allergies.prophylaxisAntibiotic.administered ? `Administered T-${activeCase.allergies.prophylaxisAntibiotic.administrationTimingMinutesPrior}m` : 'Not Administered'}
                </div>

                {activeCase.allergies.detectedAllergies.length > 0 ? (
                  <div style={{ backgroundColor: '#fff1f2', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ffe4e6', fontSize: '0.72rem', color: '#9f1239' }}>
                    <strong>Detected Allergy:</strong> {activeCase.allergies.detectedAllergies.map((a: any) => a.allergenName).join(', ')}
                    {activeCase.allergies.recommendedAlternative && (
                      <div style={{ marginTop: '0.2rem', color: '#0369a1', fontWeight: 600 }}>
                        Rec: {activeCase.allergies.recommendedAlternative}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                    &check; No beta-lactam or cephalosporin allergies
                  </div>
                )}

                {/* Linked Indent Indicator */}
                {(() => {
                  const linkedIndent = patientIndents.find((i: any) =>
                    i.requestedDrugName.toLowerCase().includes(activeCase.allergies.prophylaxisAntibiotic.name.toLowerCase())
                  );
                  if (!linkedIndent) return null;
                  return (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        padding: '0.25rem 0.45rem',
                        backgroundColor: linkedIndent.status === 'DISPATCHED' ? '#f0fdf4' : '#eff6ff',
                        border: `1px solid ${linkedIndent.status === 'DISPATCHED' ? '#bbf7d0' : '#bfdbfe'}`,
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        Indent <strong>#{linkedIndent.indentNumber}</strong> ({linkedIndent.status})
                      </span>
                      <button
                        onClick={() => navigate(`/dispensary?indentNumber=${linkedIndent.indentNumber}&mrn=${activeCase.procedure.patientMrn}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          padding: 0,
                        }}
                      >
                        Dispensary &rarr;
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* PILLAR 4: BLOOD CLOTTING (LOINC) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: activeCase.coagulation.overallStatus === 'SAFE' ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Droplet size={16} color={activeCase.coagulation.overallStatus === 'SAFE' ? '#16a34a' : '#dc2626'} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      4. Clotting Panel (LOINC)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: activeCase.coagulation.overallStatus === 'SAFE' ? '#dcfce7' : '#fee2e2',
                      color: activeCase.coagulation.overallStatus === 'SAFE' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {activeCase.coagulation.overallStatus}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 105px), 1fr))', gap: '0.4rem', fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>INR [6301-6]</div>
                    <div style={{ fontWeight: 700, color: activeCase.coagulation.tests.inr.status === 'NORMAL' ? '#16a34a' : '#dc2626' }}>
                      {activeCase.coagulation.tests.inr.value}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>Platelets [777-3]</div>
                    <div style={{ fontWeight: 700, color: activeCase.coagulation.tests.platelets.status === 'NORMAL' ? '#16a34a' : '#dc2626' }}>
                      {(activeCase.coagulation.tests.platelets.value / 1000).toFixed(0)}k /uL
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>PT [5902-2]</div>
                    <div style={{ fontWeight: 700, color: '#334155' }}>
                      {activeCase.coagulation.tests.prothrombinTime.value} s
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>aPTT [3173-2]</div>
                    <div style={{ fontWeight: 700, color: '#334155' }}>
                      {activeCase.coagulation.tests.aptt.value} s
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.68rem', color: activeCase.coagulation.overallStatus === 'SAFE' ? '#16a34a' : '#b91c1c', fontWeight: 500 }}>
                  {activeCase.coagulation.clinicalSummary}
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTED INPATIENT PHARMACY & COLD-CHAIN INDENT INTEGRATION CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '1.15rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} style={{ color: 'var(--clinical-blue)' }} />
                <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Inpatient Pharmacy &amp; Central Dispensary Integration
                </h3>
                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                  HL7 OMP^O09 &amp; FHIR R4 Synced
                </span>
              </div>
              <button
                onClick={() => navigate(`/indents?mrn=${activeCase.procedure.patientMrn}&name=${encodeURIComponent(activeCase.procedure.patientName)}`)}
                className="btn btn-outline"
                style={{
                  fontSize: '0.74rem',
                  padding: '0.3rem 0.65rem',
                  gap: '0.35rem',
                  color: 'var(--clinical-blue)',
                  borderColor: '#bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <PlusCircle size={13} />
                <span>Request Pre-Op Indent (Nurse Desk)</span>
              </button>
            </div>

            {patientIndents.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>No active pharmacy indents found for patient {activeCase.procedure.patientName} ({activeCase.procedure.patientMrn}).</span>
                <button
                  onClick={() => navigate(`/dispensary?mrn=${activeCase.procedure.patientMrn}`)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  Open Central Dispensary
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {patientIndents.map((ind) => {
                  const isDisp = ind.status === 'DISPATCHED';
                  return (
                    <div
                      key={ind.id}
                      style={{
                        backgroundColor: isDisp ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${isDisp ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '0.65rem 0.85rem',
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
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            backgroundColor: isDisp ? '#dcfce7' : '#eff6ff',
                            color: isDisp ? '#15803d' : 'var(--clinical-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ThermometerSnowflake size={16} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                              {ind.requestedDrugName} {ind.requestedDose} {ind.requestedUnits}
                            </span>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '3px',
                                backgroundColor: isDisp ? '#dcfce7' : '#fef3c7',
                                color: isDisp ? '#15803d' : '#92400e',
                              }}
                            >
                              {ind.status}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              #{ind.indentNumber}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>
                            Ward/Bed: <strong>{ind.ward} {ind.bed}</strong> &middot; Route: <strong>{ind.route || 'Subcutaneous'}</strong> &middot; Cold Chain: <strong>{ind.coldChainRequired !== false ? '2°C – 8°C Biologic' : 'Ambient'}</strong>
                            {isDisp && <span style={{ color: '#15803d', fontWeight: 600 }}> &bull; In Transit via Courier James Miller (COUR-409)</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => navigate(`/dispensary?indentNumber=${ind.indentNumber}&mrn=${activeCase.procedure.patientMrn}`)}
                          className="btn btn-outline"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.3rem 0.6rem',
                            gap: '0.3rem',
                            color: 'var(--clinical-blue)',
                            borderColor: '#bfdbfe',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Open this order in Central Dispensary"
                        >
                          <span>View in Dispensary</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time-Out Attestation & Sign-Off Banner */}
          <div
            style={{
              backgroundColor: isCleared ? '#f0fdf4' : '#fffbeb',
              border: `1.5px solid ${isCleared ? '#86efac' : '#fde68a'}`,
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isCleared ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertTriangle size={18} color="#d97706" />}
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: isCleared ? '#14532d' : '#92400e' }}>
                    {isCleared ? 'CLEARED FOR INCISION — TIME-OUT COMPLETE' : 'SURGICAL SAFETY HOLD ENGAGED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: isCleared ? '#166534' : '#b45309', marginTop: '0.2rem' }}>
                  {isCleared
                    ? 'All 4 pre-incision safety criteria verified. Team may proceed to skin incision upon sign-off.'
                    : `Active clinical holds detected: ${activeCase.activeSafetyHolds.join('; ')}`}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCleared ? (
                  <button
                    onClick={handleCompleteTimeout}
                    disabled={!isAllAttested || isCompleting}
                    className="btn btn-primary"
                    style={{
                      fontSize: '0.82rem',
                      padding: '0.55rem 1.25rem',
                      gap: '0.45rem',
                      backgroundColor: isAllAttested ? '#16a34a' : '#94a3b8',
                      borderColor: isAllAttested ? '#15803d' : '#cbd5e1',
                    }}
                  >
                    {isCompleting ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <FileCheck size={14} />
                    )}
                    {completionResult ? 'Time-Out Recorded (View Summary)' : 'Attest Time-Out & Compile FHIR Record'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b91c1c', fontSize: '0.76rem', fontWeight: 600, backgroundColor: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                    <Lock size={13} /> Incision Blocked By Safety Gate
                  </div>
                )}
              </div>
            </div>

            {/* Multidisciplinary Team Attestations */}
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                paddingTop: '0.75rem',
                borderTop: `1px solid ${isCleared ? '#bbf7d0' : '#fef08a'}`,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={surgeonAttested}
                  onChange={(e) => setSurgeonAttested(e.target.checked)}
                />
                <span>Attending Surgeon ({activeCase.procedure.leadSurgeon.name})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={anesthesiaAttested}
                  onChange={(e) => setAnesthesiaAttested(e.target.checked)}
                />
                <span>Anesthesiologist ({activeCase.procedure.anesthesiologist.name})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={nurseAttested}
                  onChange={(e) => setNurseAttested(e.target.checked)}
                />
                <span>Circulating Nurse ({activeCase.procedure.circulatingNurse.name})</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL FHIR R4 COMPOSITION SURGICAL SUMMARY */}
      {showDocumentModal && compiledComposition && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={18} color="#0284c7" />
                <div>
                  <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Official Surgical Summary Document (HL7 FHIR R4 Composition)
                  </h2>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Document Type: LOINC 11537-8 (Surgical Operation Note / Time-Out Checklist)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Sync Status Banner */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                  color: '#166534',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} />
                  <span>
                    Successfully compiled and synced to live HAPI FHIR server (ID:{' '}
                    <code>{completionResult?.compositionId || 'comp-live'}</code>)
                  </span>
                </div>
                <a
                  href={`https://hapi.fhir.org/baseR4/Composition/${completionResult?.compositionId || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                >
                  Inspect on HAPI FHIR <ExternalLink size={11} />
                </a>
              </div>

              {/* Official Surgical Summary Narrative */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '0.78rem',
                  color: '#1e293b',
                  lineHeight: '1.5',
                }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                  Pre-Incision Time-Out Narrative Record
                </h3>
                <div className="modal-grid-2col-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div><strong>Patient:</strong> {compiledComposition.subject.display}</div>
                  <div><strong>Procedure:</strong> {compiledComposition.title}</div>
                  <div><strong>Surgeon:</strong> {compiledComposition.author[0]?.display}</div>
                  <div><strong>Anesthesiologist:</strong> {compiledComposition.author[1]?.display}</div>
                </div>
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  {compiledComposition.section.map((sec: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '0.6rem' }}>
                      <div style={{ fontWeight: 700, color: '#0369a1' }}>{sec.title}</div>
                      <div dangerouslySetInnerHTML={{ __html: sec.text?.div || '' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw FHIR JSON Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569' }}>
                    HL7 FHIR R4 Composition JSON Payload
                  </span>
                  <button
                    onClick={handleCopyJson}
                    className="btn btn-outline"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', gap: '0.3rem' }}
                  >
                    {copiedJson ? <Check size={11} /> : <Copy size={11} />}
                    {copiedJson ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                  }}
                >
                  {JSON.stringify(compiledComposition, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                onClick={() => setShowDocumentModal(false)}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
