import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Send,
  RefreshCw,
  Stethoscope,
  Bell,
  X,
  ShieldCheck,
  ThermometerSnowflake,
  Edit2,
  Trash2,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { api, AuthSession } from '../services/apiClient';
import {
  notifyNurseDispatch,
  notifyPharmacistNewIndent,
  requestNotificationPermission,
  getNotificationPermission,
  sendNotification,
} from '../services/notificationClient';

interface NurseDeskProps {
  session: AuthSession;
  onOpenCompliance?: () => void;
}

const generateUniqueMrn = () => `MRN-${Math.floor(100000 + Math.random() * 900000)}`;

export const PATIENT_SURGERIES: Record<string, string> = {
  'MRN-849201': 'Right Total Hip Arthroplasty (OR Suite 3)',
  'MRN-782104': 'Laparoscopic Cholecystectomy (OR Suite 1)',
  'MRN-719302': 'Laparoscopic Cholecystectomy (OR Suite 1)',
  'MRN-551920': 'CABG x3 (Cardiac OR 2)',
  'MRN-554109': 'CABG x3 (Cardiac OR 2)',
  'MRN-449120': 'Lumbar Spinal Fusion (OR Suite 5)',
};

const PATIENT_PRESETS = [
  {
    name: 'WARREN, ELIZABETH',
    mrn: 'MRN-849201',
    ward: 'Ward 4B (Post-Op)',
    bed: 'Bed 12',
    drug: 'Insulin Glargine',
    dose: '100',
    units: 'UNIT',
    route: 'Subcutaneous (SC)',
    coldChain: true,
    surgery: 'Right Total Hip Arthroplasty (OR Suite 3)',
  },
  {
    name: 'RAHIM UDDIN',
    mrn: 'MRN-882194',
    ward: 'Ward 4B (Male Medicine)',
    bed: 'Bed 04',
    drug: 'Inj. Ceftriaxone',
    dose: '1',
    units: 'G',
    route: 'Intravenous (IV)',
    coldChain: false,
  },
  {
    name: 'FARUK, OMAR',
    mrn: 'MRN-782104',
    ward: 'Ward 4B (Surgery)',
    bed: 'Bed 08',
    drug: 'Inj. Cefazolin',
    dose: '2',
    units: 'G',
    route: 'Intravenous (IV)',
    coldChain: false,
    surgery: 'Laparoscopic Cholecystectomy (OR Suite 1)',
  },
  {
    name: 'BEGUM ROKEYA',
    mrn: 'MRN-671203',
    ward: 'Cabin Block (5th Fl)',
    bed: 'Cabin 502',
    drug: 'Inj. Enoxaparin (Clexane)',
    dose: '40',
    units: 'MG',
    route: 'Subcutaneous (SC)',
    coldChain: true,
  },
  {
    name: 'MILLER, DAVID R.',
    mrn: 'MRN-551920',
    ward: 'Ward 3B (Cardiac)',
    bed: 'Bed 22',
    drug: 'Inj. Filgrastim',
    dose: '300',
    units: 'MCG',
    route: 'Subcutaneous (SC)',
    coldChain: true,
    surgery: 'CABG x3 (Cardiac OR 2)',
  },
  {
    name: 'MOHAMMAD TANVIR',
    mrn: 'MRN-910245',
    ward: 'ICU / CCU',
    bed: 'Bed ICU-02',
    drug: 'Inj. Meropenem',
    dose: '1',
    units: 'G',
    route: 'Intravenous (IV)',
    coldChain: false,
  },
];

export const NurseDesk: React.FC<NurseDeskProps> = ({ session }) => {
  const isNurse = session?.user?.role === 'NURSE';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [indents, setIndents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State - Automatic Unique MRN & Patient Preset
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [patientMrn, setPatientMrn] = useState(generateUniqueMrn);
  const [patientName, setPatientName] = useState('WARREN, ELIZABETH');
  const [requestedDrugName, setRequestedDrugName] = useState('Insulin Glargine');
  const [requestedDose, setRequestedDose] = useState('100');
  const [requestedUnits, setRequestedUnits] = useState('UNIT');
  const [route, setRoute] = useState('Subcutaneous (SC)');
  const [coldChainRequired, setColdChainRequired] = useState(true);
  const [ward, setWard] = useState('Ward 4B');
  const [bed, setBed] = useState('Bed 12');
  const [priority, setPriority] = useState('ROUTINE');
  const [allowAdditionalDose, setAllowAdditionalDose] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to intelligently set cold chain & route suggestion when drug changes
  const handleDrugChange = (val: string) => {
    setRequestedDrugName(val);
    const lower = val.toLowerCase();
    if (
      lower.includes('insulin') ||
      lower.includes('filgrastim') ||
      lower.includes('trastuzumab') ||
      lower.includes('enoxaparin') ||
      lower.includes('clexane') ||
      lower.includes('vaccine') ||
      lower.includes('albumin')
    ) {
      setColdChainRequired(true);
      if (lower.includes('insulin') || lower.includes('filgrastim') || lower.includes('enoxaparin') || lower.includes('clexane')) {
        setRoute('Subcutaneous (SC)');
      }
    } else {
      setColdChainRequired(false);
      if (
        lower.includes('ceftriaxone') ||
        lower.includes('cefazolin') ||
        lower.includes('meropenem') ||
        lower.includes('paracetamol')
      ) {
        setRoute('Intravenous (IV)');
      } else if (lower.includes('omeprazole')) {
        setRoute('Oral (PO)');
      }
    }
  };

  // Read URL search params (e.g. from OR surgery checklist deep link)
  useEffect(() => {
    const urlMrn = searchParams.get('mrn');
    const urlName = searchParams.get('name');
    if (urlMrn) {
      setPatientMrn(urlMrn);
      const preset = PATIENT_PRESETS.find((p) => p.mrn === urlMrn);
      if (preset) {
        setPatientName(preset.name);
        setWard(preset.ward);
        setBed(preset.bed);
        setRequestedDrugName(preset.drug);
        setRequestedDose(preset.dose);
        setRequestedUnits(preset.units);
        if (preset.route) setRoute(preset.route);
        if (preset.coldChain !== undefined) setColdChainRequired(preset.coldChain);
      } else if (urlName) {
        setPatientName(decodeURIComponent(urlName));
      }
    }
  }, [searchParams]);

  // Duplicate active pending detection by BOTH MRN AND Drug Name
  const duplicatePending = useMemo(() => {
    if (!patientMrn.trim() || !requestedDrugName.trim()) return null;
    return indents.find(
      (ind) =>
        ind.status === 'PENDING' &&
        ind.patientMrn.trim().toLowerCase() === patientMrn.trim().toLowerCase() &&
        ind.requestedDrugName.trim().toLowerCase() === requestedDrugName.trim().toLowerCase()
    );
  }, [indents, patientMrn, requestedDrugName]);

  // Edit Modal State
  const [editingIndent, setEditingIndent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    requestedDrugName: '',
    requestedDose: '',
    requestedUnits: 'UNIT',
    route: 'Subcutaneous (SC)',
    priority: 'ROUTINE',
    ward: 'Ward 4B',
    bed: '',
    patientName: '',
    patientMrn: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter & Search & Pagination State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Browser Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  );

  // Floating In-App Toast
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    body: string;
  } | null>(null);

  // Tracking dispatched IDs to avoid duplicate alerts
  const knownDispatchedIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Listen for unified custom toast events
  useEffect(() => {
    const handleToast = (e: any) => {
      if (e.detail && isNurse && (!e.detail.recipient || e.detail.recipient === 'NURSE')) {
        setToastNotification({
          id: String(Date.now()),
          title: e.detail.title,
          body: e.detail.body,
        });
      }
    };
    window.addEventListener('dna-health-discreet-toast', handleToast);
    return () => window.removeEventListener('dna-health-discreet-toast', handleToast);
  }, [isNurse]);

  const handleRequestNotificationPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      await sendNotification({
        recipient: 'NURSE',
        orderReference: 'SETUP',
        action: 'Notifications enabled',
        detail: 'You will receive dispatch alerts here.',
      });
    }
  };

  // Fetch indents
  const fetchIndents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getIndents();
      setIndents(data);

      if (initialLoadDone.current) {
        data.forEach((item: any) => {
          if (item.status === 'DISPATCHED' && !knownDispatchedIds.current.has(item.id)) {
            knownDispatchedIds.current.add(item.id);
            if (isNurse) {
              notifyNurseDispatch(
                item.indentNumber || 'WF-UNKNOWN',
                'James Miller (COUR-409)',
                10
              );
            }
          }
        });
      } else {
        data.forEach((item: any) => {
          if (item.status === 'DISPATCHED') {
            knownDispatchedIds.current.add(item.id);
          }
        });
        initialLoadDone.current = true;
      }
    } catch (err: any) {
      console.error('Failed to load indents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndents();
    const interval = setInterval(fetchIndents, 4000);
    const handleSync = () => fetchIndents();
    window.addEventListener('dna-health-indents-updated', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('dna-health-indents-updated', handleSync);
    };
  }, []);

  // Preset Handlers
  const applyPreset = (
    drug: string,
    dose: string,
    units: string,
    prio = 'ROUTINE',
    rte = 'Subcutaneous (SC)',
    coldChain = true
  ) => {
    setRequestedDrugName(drug);
    setRequestedDose(dose);
    setRequestedUnits(units);
    setPriority(prio);
    setRoute(rte);
    setColdChainRequired(coldChain);
    setAllowAdditionalDose(false);
  };

  // Create Indent
  const handleCreateIndent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientMrn.trim() || !requestedDrugName.trim() || !requestedDose.trim() || !ward.trim()) {
      setActionMessage({
        type: 'error',
        text: 'Please complete all required fields: Patient MRN, Patient Name, Prescribed Medication, Dose, and Ward are mandatory.',
      });
      return;
    }

    if (duplicatePending && !allowAdditionalDose) {
      setActionMessage({
        type: 'error',
        text: `Active Order Notice: Indent #${duplicatePending.indentNumber} for ${duplicatePending.requestedDrugName} is already pending for this patient. If you need to requisition an additional/repeat dose, please tick "Confirm Repeat / Additional Dose" below.`,
      });
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const newIndent = await api.createIndent({
        patientMrn: patientMrn.trim(),
        patientName: (patientName || 'Bedside Inpatient').trim(),
        requestedDrugName: requestedDrugName.trim(),
        requestedDose: requestedDose.trim(),
        requestedUnits: requestedUnits.trim(),
        route: route.trim(),
        ward: ward.trim(),
        bed: bed.trim(),
        priority,
        coldChainRequired,
      });

      // Clear medicine fields so nurse can requisition next medicine for same patient or start new patient
      setRequestedDrugName('');
      setRequestedDose('');
      setAllowAdditionalDose(false);
      setStatusFilter('ALL');
      setCurrentPage(1);

      setActionMessage({
        type: 'success',
        text: `✓ Requisition #${newIndent.indentNumber} submitted successfully for ${newIndent.patientName} (${newIndent.requestedDrugName} ${newIndent.requestedDose} ${newIndent.requestedUnits}). Queued for Central Pharmacy dispensing.`,
      });

      // Notify pharmacy of new indent
      notifyPharmacistNewIndent(newIndent.indentNumber, newIndent.requestedDrugName);

      await fetchIndents();
      window.dispatchEvent(new CustomEvent('dna-health-indents-updated'));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit indent.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (indent: any) => {
    setEditingIndent(indent);
    setEditForm({
      requestedDrugName: indent.requestedDrugName,
      requestedDose: indent.requestedDose,
      requestedUnits: indent.requestedUnits || 'UNIT',
      route: indent.route || 'Subcutaneous (SC)',
      priority: indent.priority || 'ROUTINE',
      ward: indent.ward,
      bed: indent.bed || '',
      patientName: indent.patientName,
      patientMrn: indent.patientMrn,
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndent) return;
    setIsUpdating(true);
    try {
      await api.updateIndent(editingIndent.id, editForm);
      setActionMessage({
        type: 'success',
        text: `Request ${editingIndent.indentNumber} successfully updated.`,
      });
      setEditingIndent(null);
      fetchIndents();
      window.dispatchEvent(new CustomEvent('dna-health-indents-updated'));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update request.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel Request
  const handleCancel = async (id: string, indentNumber: string) => {
    if (!window.confirm(`Are you sure you want to cancel request ${indentNumber}?`)) return;
    try {
      await api.cancelIndent(id);
      setActionMessage({
        type: 'success',
        text: `Request ${indentNumber} has been cancelled.`,
      });
      fetchIndents();
      window.dispatchEvent(new CustomEvent('dna-health-indents-updated'));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cancel request.' });
    }
  };

  // Delete Request
  const handleDelete = async (id: string, indentNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete request ${indentNumber}? This cannot be undone.`)) return;
    try {
      await api.deleteIndent(id);
      setActionMessage({
        type: 'success',
        text: `Request ${indentNumber} permanently deleted.`,
      });
      fetchIndents();
      window.dispatchEvent(new CustomEvent('dna-health-indents-updated'));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete request.' });
    }
  };

  // Filtered & Paginated Indents
  const filteredIndents = useMemo(() => {
    return indents.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.indentNumber.toLowerCase().includes(q) ||
        item.requestedDrugName.toLowerCase().includes(q) ||
        item.patientMrn.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [indents, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredIndents.length / pageSize));
  const paginatedIndents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIndents.slice(start, start + pageSize);
  }, [filteredIndents, currentPage, pageSize]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: indents.length,
      pending: indents.filter((i) => i.status === 'PENDING').length,
      dispatched: indents.filter((i) => i.status === 'DISPATCHED').length,
      cancelled: indents.filter((i) => i.status === 'CANCELLED').length,
    };
  }, [indents]);

  // Dispatched items for the separate notification section
  const dispatchedList = useMemo(() => {
    return indents.filter((i) => i.status === 'DISPATCHED');
  }, [indents]);

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Floating In-App Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1.5rem',
            zIndex: 9999,
            maxWidth: '360px',
            backgroundColor: '#ffffff',
            border: '1px solid #bbf7d0',
            borderLeft: '4px solid #16a34a',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.2s ease-in',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontWeight: 700, fontSize: '0.8rem' }}>
              <Bell size={14} />
              <span>{toastNotification.title}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.4 }}>
            {toastNotification.body}
          </div>
          <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={11} />
            <span>No patient data shared</span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#eff6ff', color: 'var(--clinical-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Nurse Station — Ward 4B
              </h1>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', gap: '0.25rem' }}>
                <ThermometerSnowflake size={10} /> Cold-Chain Ready
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {isNurse ? (
                <>Duty Ward Nurse: <strong>{session.user.fullName} (RN)</strong> &middot; Ward Drop-off: <strong>Ward 4B Med Fridge Lockbox A</strong></>
              ) : (
                <>Clinical Oversight (Read-Only): Signed in as <strong>{session.user.fullName}</strong> ({session.user.role}) &middot; Station: <strong>Ward 4B Inpatient Desk</strong></>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#047857',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '0.3rem 0.55rem',
              borderRadius: '4px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="HIPAA Safe Harbor Guarantee: Notification center & lock screen payloads contain 0 patient identifiers (No names, MRNs, or DOBs)"
          >
            <ShieldCheck size={12} /> Privacy Protected
          </span>

          {isNurse && (
            notificationPermission === 'granted' ? (
              <span style={{ fontSize: '0.72rem', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.3rem 0.55rem', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Bell size={12} /> Alerts Active
              </span>
            ) : (
              <button
                onClick={handleRequestNotificationPermission}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '0.35rem', color: 'var(--clinical-blue)', borderColor: '#bfdbfe' }}
              >
                <Bell size={12} /> Enable Native Alerts
              </button>
            )
          )}

          <button
            onClick={fetchIndents}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '0.35rem' }}
          >
            <RefreshCw size={12} className={isLoading ? 'spin' : ''} /> Refresh
          </button>

          {isNurse ? (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
            >
              <PlusCircle size={13} /> {showCreateForm ? 'Hide Form' : 'New Request'}
            </button>
          ) : (
            <span className="badge badge-blue" style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}>
              Read-Only Oversight
            </span>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          style={{
            backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
            borderRadius: '6px',
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP SECTION: INCOMING DELIVERIES (HIGH PRIORITY FOR NURSES) */}
      <div
        id="incoming-deliveries-section"
        className="card"
        style={{
          padding: '1.1rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #bbf7d0',
          borderTop: '4px solid #16a34a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Incoming Deliveries
                </h2>
                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                  {dispatchedList.length} Active {dispatchedList.length === 1 ? 'Shipment' : 'Shipments'}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
                Live cold-chain medications dispatched from Central Pharmacy en route to Ward 4B
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
              <ShieldCheck size={13} /> Zero PHI &middot; Safe Harbor
            </span>
            {isNurse && (
              <button
                onClick={() => notifyNurseDispatch('WF-2026-DEMO', 'James Miller (COUR-409)', 10)}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', gap: '0.3rem', color: '#15803d', borderColor: '#86efac', backgroundColor: '#ffffff' }}
                title="Test native push notification for on-duty nurse"
              >
                <Bell size={11} /> Test Push
              </button>
            )}
          </div>
        </div>

        {/* Deliveries List */}
        {dispatchedList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.78rem' }}>
            <Clock size={18} style={{ color: '#94a3b8', margin: '0 auto 0.25rem auto' }} />
            <div>No courier deliveries currently en route to Ward 4B.</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              When Central Pharmacy approves and dispatches a medication request, live courier tracking appears here immediately.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {dispatchedList.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#14532d' }}>
                      {item.indentNumber}
                    </span>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                      En Route (~10 mins)
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.requestedDrugName} {item.requestedDose} {item.requestedUnits}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#334155' }}>
                    Courier: <strong>James Miller (COUR-409)</strong> &middot; Destination: <strong>{item.ward || 'Ward 4B'} - Med Fridge Lockbox A</strong> &middot; Temp: <strong>2°C–8°C</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/dispensary?indentNumber=${item.indentNumber}`)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: '#15803d', borderColor: '#86efac', backgroundColor: '#ffffff', gap: '0.25rem' }}
                  >
                    <span>View in Dispensary</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SECTION: BEDSIDE INDENT REQUESTS & MANAGEMENT */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        {/* Header with Search and Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Medication Requests
            </h2>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Submit or manage medication requests
            </div>
          </div>

          {/* Quick Filter Tabs & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
              {(['ALL', 'PENDING', 'DISPATCHED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: statusFilter === st ? '#ffffff' : 'transparent',
                    color: statusFilter === st ? 'var(--clinical-blue)' : '#64748b',
                    boxShadow: statusFilter === st ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {st === 'ALL' ? `All (${counts.all})` : st === 'PENDING' ? `Pending (${counts.pending})` : st === 'DISPATCHED' ? `Dispatched (${counts.dispatched})` : `Cancelled (${counts.cancelled})`}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search drug or MRN..."
                style={{
                  padding: '0.3rem 0.5rem 0.3rem 1.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  width: '160px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Requisition Section: Form for Nurses, Read-Only Guard Banner for Non-Nurses */}
        {!isNurse ? (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #0284c7',
              borderRadius: '6px',
              padding: '0.85rem 1.1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={16} color="#0284c7" />
                <span>Clinical Role Separation: Ward Nurse Requisition Authority</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.25rem 0 0 0', lineHeight: 1.45 }}>
                Under hospital clinical governance and BD inpatient protocol, bedside medication requisitions can only be authored and submitted by on-duty Ward Nurses attending patients.
                You are signed in as <strong>{session.user.fullName} ({session.user.role})</strong> with <em>Read-Only Ward Oversight</em> permissions.
              </p>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
              Admin Oversight Active
            </span>
          </div>
        ) : showCreateForm && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.1rem 1.25rem',
              marginBottom: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header & Quick Drug Presets */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.65rem',
                marginBottom: '0.85rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  Bedside Medication Requisition
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.5rem' }}>
                  Direct electronic indent to Central Dispensary
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>Quick Drug:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('Insulin Glargine', '100', 'UNIT', 'ROUTINE', 'Subcutaneous (SC)', true)}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 500 }}
                  title="Insulin Glargine 100 UNIT SC (Cold-Chain)"
                >
                  Insulin 100U (SC)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Inj. Ceftriaxone', '1', 'G', 'ROUTINE', 'Intravenous (IV)', false)}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 500 }}
                  title="Inj. Ceftriaxone 1g IV"
                >
                  Ceftriaxone 1g (IV)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Inj. Enoxaparin (Clexane)', '40', 'MG', 'ROUTINE', 'Subcutaneous (SC)', true)}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#0284c7', cursor: 'pointer', fontWeight: 500 }}
                  title="Inj. Enoxaparin 40mg SC (Cold-Chain)"
                >
                  Enoxaparin 40mg (SC)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Inj. Cefazolin', '2', 'G', 'URGENT', 'Intravenous (IV)', false)}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#c2410c', cursor: 'pointer', fontWeight: 500 }}
                  title="Inj. Cefazolin 2g IV (Surgical Prophylaxis)"
                >
                  Cefazolin 2g (IV)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Inj. Paracetamol IV', '1000', 'MG', 'STAT', 'Intravenous (IV)', false)}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500 }}
                  title="Inj. Paracetamol 1000mg IV STAT"
                >
                  Paracetamol 1g (STAT)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateIndent}>
              {/* Patient Quick Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Select Inpatient:</span>
                {PATIENT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setPatientName(p.name);
                      setWard(p.ward);
                      setBed(p.bed);
                      setPatientMrn(p.mrn);
                      if (p.drug) {
                        setRequestedDrugName(p.drug);
                        setRequestedDose(p.dose);
                        setRequestedUnits(p.units);
                        if (p.route) setRoute(p.route);
                        if (p.coldChain !== undefined) setColdChainRequired(p.coldChain);
                      }
                      setAllowAdditionalDose(false);
                    }}
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: patientName === p.name ? '1px solid var(--clinical-blue)' : '1px solid #e2e8f0',
                      backgroundColor: patientName === p.name ? '#eff6ff' : '#ffffff',
                      color: patientName === p.name ? 'var(--clinical-blue)' : '#475569',
                      fontWeight: patientName === p.name ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {p.name} ({p.bed})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPatientMrn(generateUniqueMrn());
                    setPatientName('');
                    setRequestedDrugName('');
                    setRequestedDose('');
                    setBed('');
                    setAllowAdditionalDose(false);
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px dashed #94a3b8',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                  title="Clear fields and generate new MRN"
                >
                  + New Inpatient
                </button>
              </div>

              {/* Duplicate Request Advisory Banner (Safe Override Available) */}
              {duplicatePending && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#92400e', fontSize: '0.74rem', flex: 1 }}>
                    <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                    <span>
                      <strong>Active Order Caution:</strong> Indent <strong>#{duplicatePending.indentNumber}</strong> for <strong>{duplicatePending.patientName}</strong> ({duplicatePending.requestedDrugName} {duplicatePending.requestedDose} {duplicatePending.requestedUnits}) is currently pending in {duplicatePending.ward}.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#78350f', cursor: 'pointer', fontWeight: 600, backgroundColor: '#fef3c7', padding: '0.25rem 0.55rem', borderRadius: '4px' }}>
                      <input
                        type="checkbox"
                        checked={allowAdditionalDose}
                        onChange={(e) => setAllowAdditionalDose(e.target.checked)}
                      />
                      Confirm Repeat / Additional Dose
                    </label>
                    <button
                      type="button"
                      onClick={() => setPatientMrn(generateUniqueMrn())}
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: '#ffffff',
                        color: '#b45309',
                        borderColor: '#fcd34d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={11} /> Auto-Generate MRN
                    </button>
                  </div>
                </div>
              )}

              {/* Row 1: Patient Details & Bed Location */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>
                      Patient MRN / Reg # <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPatientMrn(generateUniqueMrn())}
                      title="Generate fresh unique MRN"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--clinical-blue)',
                        fontSize: '0.64rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <RefreshCw size={10} /> Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={patientMrn}
                    onChange={(e) => setPatientMrn(e.target.value)}
                    placeholder="e.g. MRN-882194"
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Rahim Uddin"
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Ward / Unit <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="e.g. Ward 4B, Cabin Block, ICU"
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Bed / Cabin No
                  </label>
                  <input
                    type="text"
                    value={bed}
                    onChange={(e) => setBed(e.target.value)}
                    placeholder="e.g. Bed 12 or Cabin 502"
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Medication & Dosing */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Prescribed Medication <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    list="medication-catalog-list"
                    value={requestedDrugName}
                    onChange={(e) => handleDrugChange(e.target.value)}
                    placeholder="Type or select drug name..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.55rem',
                      fontSize: '0.78rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <datalist id="medication-catalog-list">
                    <option value="Insulin Glargine" />
                    <option value="Inj. Ceftriaxone" />
                    <option value="Inj. Enoxaparin (Clexane)" />
                    <option value="Inj. Cefazolin" />
                    <option value="Inj. Meropenem" />
                    <option value="Inj. Filgrastim" />
                    <option value="Inj. Paracetamol IV" />
                    <option value="Tab. Omeprazole" />
                    <option value="Inj. Ondansetron" />
                    <option value="Inj. Pantoprazole" />
                    <option value="Trastuzumab" />
                  </datalist>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Dose &amp; Units <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      value={requestedDose}
                      onChange={(e) => setRequestedDose(e.target.value)}
                      placeholder="Dose"
                      required
                      style={{
                        width: '55%',
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.78rem',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                    <select
                      value={requestedUnits}
                      onChange={(e) => setRequestedUnits(e.target.value)}
                      style={{
                        width: '45%',
                        padding: '0.4rem 0.35rem',
                        fontSize: '0.74rem',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="UNIT">UNIT</option>
                      <option value="MG">MG</option>
                      <option value="G">G</option>
                      <option value="MCG">MCG</option>
                      <option value="ML">ML</option>
                      <option value="VIAL">VIAL</option>
                      <option value="AMP">AMP</option>
                      <option value="TAB">TAB</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Route of Admin <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.74rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                    <option value="Intravenous (IV)">Intravenous (IV)</option>
                    <option value="Oral (PO)">Oral (PO)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Inhalation / Nebulizer">Inhalation / Nebulizer</option>
                    <option value="Topical / Drops">Topical / Drops</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                    Priority / Urgency <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.74rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontWeight: priority === 'STAT' ? 700 : priority === 'URGENT' ? 600 : 400,
                      color: priority === 'STAT' ? '#b91c1c' : priority === 'URGENT' ? '#c2410c' : '#1e293b',
                    }}
                  >
                    <option value="ROUTINE">Routine Round</option>
                    <option value="URGENT">Urgent (1 Hour)</option>
                    <option value="STAT">STAT / Emergency</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Cold Chain Storage Toggle & Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: coldChainRequired ? '#0369a1' : '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={coldChainRequired}
                    onChange={(e) => setColdChainRequired(e.target.checked)}
                  />
                  <ThermometerSnowflake size={14} color={coldChainRequired ? '#0284c7' : '#94a3b8'} />
                  <span>Cold Chain Storage Required (2°C–8°C Transit)</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientMrn(generateUniqueMrn());
                      setPatientName('');
                      setRequestedDrugName('');
                      setRequestedDose('');
                      setBed('');
                      setAllowAdditionalDose(false);
                    }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', color: '#64748b' }}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.42rem 1rem',
                      gap: '0.35rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Send size={13} /> {isSubmitting ? 'Submitting Requisition...' : 'Submit Requisition to Central Pharmacy'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Compact Table */}
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.5rem 0.6rem' }}>Request #</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>Priority</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>Medication</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>Patient</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>Status</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIndents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                    No medication requests found matching current filter.
                  </td>
                </tr>
              ) : (
                paginatedIndents.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: item.status === 'DISPATCHED' ? '#f0fdf4' : item.status === 'CANCELLED' ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.indentNumber}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: item.priority === 'STAT' ? '#fee2e2' : item.priority === 'URGENT' ? '#ffedd5' : '#f1f5f9',
                          color: item.priority === 'STAT' ? '#991b1b' : item.priority === 'URGENT' ? '#9a3412' : '#475569',
                        }}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem', color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <strong>{item.requestedDrugName}</strong>
                        {item.coldChainRequired && (
                          <span
                            title="Requires 2°C–8°C Cold Chain Transit"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.15rem',
                              backgroundColor: '#eff6ff',
                              color: '#0284c7',
                              border: '1px solid #bfdbfe',
                              borderRadius: '3px',
                              padding: '0.05rem 0.3rem',
                              fontSize: '0.64rem',
                              fontWeight: 600,
                            }}
                          >
                            <ThermometerSnowflake size={10} /> 2°C–8°C
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                        {item.requestedDose} {item.requestedUnits} &middot; <span style={{ color: '#334155', fontWeight: 500 }}>{item.route || 'Bedside'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem', color: '#475569' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.patientName}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                        MRN: {item.patientMrn} &middot; {item.ward} {item.bed || ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <span
                        className={`badge ${
                          item.status === 'DISPATCHED' ? 'badge-green' : item.status === 'PENDING' ? 'badge-blue' : 'badge-neutral'
                        }`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => navigate(`/dispensary?indentNumber=${item.indentNumber}&mrn=${item.patientMrn}`)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem',
                            gap: '0.25rem',
                            color: 'var(--clinical-blue)',
                            borderColor: '#bfdbfe',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Inspect order in Central Dispensary"
                        >
                          <span>Dispensary</span>
                          <ArrowRight size={10} />
                        </button>
                        {isNurse && item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.2rem' }}
                              title="Modify / Edit this request"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                            <button
                              onClick={() => handleCancel(item.id, item.indentNumber)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.2rem', color: '#b45309', borderColor: '#fde68a' }}
                              title="Cancel request"
                            >
                              <Ban size={11} /> Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.indentNumber)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              title="Delete request"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                        {item.status === 'DISPATCHED' && (
                          <a
                            href="#incoming-deliveries-section"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#15803d',
                              textDecoration: 'none',
                              backgroundColor: '#dcfce7',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '4px',
                            }}
                          >
                            <CheckCircle2 size={11} /> En Route &uarr;
                          </a>
                        )}
                        {item.status === 'CANCELLED' && (
                          <button
                            onClick={() => handleDelete(item.id, item.indentNumber)}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', color: '#94a3b8' }}
                            title="Remove cancelled request"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
          <div>
            Showing <strong>{filteredIndents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>–
            <strong>{Math.min(currentPage * pageSize, filteredIndents.length)}</strong> of <strong>{filteredIndents.length}</strong> requests
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.25rem 0.55rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.25rem 0.55rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>



      {/* EDIT INDENT MODAL */}
      {editingIndent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div className="card modal-dialog-responsive" style={{ maxWidth: '500px', width: '100%', padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 size={16} style={{ color: 'var(--clinical-blue)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Edit Request {editingIndent.indentNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingIndent(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-grid-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Medication</label>
                  <input
                    type="text"
                    value={editForm.requestedDrugName}
                    onChange={(e) => setEditForm({ ...editForm, requestedDrugName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Dose</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      value={editForm.requestedDose}
                      onChange={(e) => setEditForm({ ...editForm, requestedDose: e.target.value })}
                      required
                      style={{ width: '60%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <select
                      value={editForm.requestedUnits}
                      onChange={(e) => setEditForm({ ...editForm, requestedUnits: e.target.value })}
                      style={{ width: '40%', padding: '0.35rem 0.2rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="UNIT">UNIT</option>
                      <option value="MG">MG</option>
                      <option value="MCG">MCG</option>
                      <option value="ML">ML</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Patient Name</label>
                  <input
                    type="text"
                    value={editForm.patientName}
                    onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>MRN</label>
                  <input
                    type="text"
                    value={editForm.patientMrn}
                    onChange={(e) => setEditForm({ ...editForm, patientMrn: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Ward & Bed</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      value={editForm.ward}
                      onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                      required
                      style={{ width: '55%', padding: '0.35rem 0.4rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="text"
                      value={editForm.bed}
                      onChange={(e) => setEditForm({ ...editForm, bed: e.target.value })}
                      placeholder="Bed"
                      style={{ width: '45%', padding: '0.35rem 0.4rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Route of Admin</label>
                  <select
                    value={editForm.route}
                    onChange={(e) => setEditForm({ ...editForm, route: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                    <option value="Intravenous (IV)">Intravenous (IV)</option>
                    <option value="Oral (PO)">Oral (PO)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Inhalation / Nebulizer">Inhalation / Nebulizer</option>
                    <option value="Topical / Drops">Topical / Drops</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingIndent(null)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
