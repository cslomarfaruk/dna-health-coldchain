import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PipelineTimeline, PipelineStage, StageStatusMap } from './components/PipelineTimeline';
import { PrescriptionCard } from './components/PrescriptionCard';
import { RxNavValidator } from './components/RxNavValidator';
import { HL7v2Viewer, ReconciliationSummary } from './components/HL7v2Viewer';
import { ColdChainCard } from './components/ColdChainCard';
import { HipaaGuardCard } from './components/HipaaGuardCard';
import { FhirJsonViewer } from './components/FhirJsonViewer';
import { LoginPage } from './components/LoginPage';
import { NurseDesk } from './components/NurseDesk';
import { AuditorVault } from './components/AuditorVault';
import { DispensaryDashboard } from './components/DispensaryDashboard';
import { UnifiedDispensaryWorkstation } from './components/UnifiedDispensaryWorkstation';
import { OrderRecords } from './components/OrderRecords';
import { SurgicalSafetyWorkstation } from './components/SurgicalSafetyWorkstation';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { api, AuthSession, getStoredSession, setStoredSession } from './services/apiClient';

import { SAMPLE_HL7_SCENARIOS } from './data/sampleHl7Messages';
import { parseOmp09Message } from './services/hl7v2Service';
import { validateMedicationOrder } from './services/rxnavService';
import { packageColdChainMedication, CoolerPackage } from './services/coldChainService';
import { buildFhirMedicationRequest, buildFhirMedicationDispense } from './services/fhirDispenseService';
import { sanitizeOutboundNurseAlert } from './services/hipaaSanitizer';
import { buildFhirAuditEvent } from './services/fhirAuditService';
import { notifyPharmacistFulfilled, notifyNurseDispatch } from './services/notificationClient';

import {
  Omp09ParsedOrder,
  ValidatedDrugInfo,
  DeIdentifiedNurseAlert,
  HipaaSanitizationReport,
  FhirMedicationRequest,
  FhirMedicationDispense,
  FhirAuditEvent
} from './types/clinical';

// Main Inner Application with Routing Context
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SAMPLE_HL7_SCENARIOS[0].id);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('INDENT');
  const hasInitialized = useRef(false);
  const requestSeqRef = useRef(0);
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [activeIndent, setActiveIndent] = useState<any>(null);
  const [availableIndents, setAvailableIndents] = useState<any[]>([]);
  const [dispensaryViewMode, setDispensaryViewMode] = useState<'UNIFIED' | 'STEPPER'>('UNIFIED');

  // Active Clinical State
  const [parsedOrder, setParsedOrder] = useState<Omp09ParsedOrder>(() =>
    parseOmp09Message(SAMPLE_HL7_SCENARIOS[0].rawMessage)
  );

  const [validatedDrug, setValidatedDrug] = useState<ValidatedDrugInfo>({
    queryName: 'Insulin Glargine',
    rxcui: '274783',
    officialName: 'insulin glargine',
    termType: 'IN',
    formulation: 'insulin glargine 100 UNT/ML Injectable Solution',
    isRefrigeratedColdChain: true,
    requiredTempRange: { minCelsius: 2.0, maxCelsius: 8.0 },
    activeIngredients: ['insulin glargine'],
    availableForms: ['insulin glargine 100 UNT/ML Injectable Solution [Lantus]', '3 ML insulin glargine 100 UNT/ML Pen Injector [Basaglar]'],
    validationStatus: 'MATCHED_OFFICIAL',
    formulationMatch: {
      status: 'EXACT_MATCH',
      prescribedStrength: '100 UNT/ML',
      matchedConceptName: 'insulin glargine 100 UNT/ML Injectable Solution [Lantus]',
      clinicalSafetyNotes: 'Verified: Prescribed strength "100 UNT/ML" matches registered NLM Semantic Clinical Drug "insulin glargine 100 UNT/ML Injectable Solution [Lantus]".',
    },
    fetchedAt: new Date().toISOString(),
  });

  const [coolerPackage, setCoolerPackage] = useState<CoolerPackage>(() =>
    packageColdChainMedication('insulin glargine', '274783', 'Ward 4B Bed 12', 10)
  );

  const [nurseAlert, setNurseAlert] = useState<DeIdentifiedNurseAlert>({
    alertId: 'ALT-9042',
    tokenizedOrderRef: 'ORD-CC-9042',
    destinationDropZone: 'Ward 4B - Med Fridge Lockbox A',
    medicationClassification: 'Refrigerated Biologic [Cold Chain 2°C - 8°C]',
    courierIdentifier: 'James Miller (Courier ID: COUR-409)',
    estimatedArrivalTimestamp: '10:45 AM',
    estimatedMinutesAway: 10,
    specialHandlingInstructions: 'CRITICAL: Cold-chain sensitive. Verify cooler thermal seal upon arrival. Transfer immediately into 2°C - 8°C ward refrigerator.',
    containsPhi: false,
    sanitizedFieldsCount: 4,
    cryptographicToken: '28d8cbf286b40bdc',
  });

  const [hipaaReport, setHipaaReport] = useState<HipaaSanitizationReport>({
    safeHarborCompliant: true,
    scrubbedIdentifiers: [
      { identifierType: 'Patient Full Name', originalValueMasked: 'W***** E********', actionTaken: 'STRIPPED' },
      { identifierType: 'Medical Record Number (MRN)', originalValueMasked: 'M**-******', actionTaken: 'TOKENIZED_NON_REVERSIBLE' },
      { identifierType: 'Date of Birth', originalValueMasked: '****-**-**', actionTaken: 'STRIPPED' },
      { identifierType: 'Granular Bed Location', originalValueMasked: 'WARD-4B-BED-12', actionTaken: 'GENERALIZED_ZONE' },
    ],
    sha256AuditDigest: '28d8cbf286b40bdc594e59b057a1dbaf9597119590903fe1b316c8d86bd3cd15',
  });

  const [fhirMedRequest, setFhirMedRequest] = useState<FhirMedicationRequest>(() =>
    buildFhirMedicationRequest(parsedOrder, validatedDrug)
  );

  const [fhirMedDispense, setFhirMedDispense] = useState<FhirMedicationDispense>(() =>
    buildFhirMedicationDispense(fhirMedRequest, coolerPackage)
  );

  const [fhirAuditEvent, setFhirAuditEvent] = useState<FhirAuditEvent>(() =>
    buildFhirAuditEvent(fhirMedDispense, hipaaReport)
  );

  // Role Switcher Handler (signs in as that persona and routes to their dedicated view)
  const handleRoleChange = async (newRole: string) => {
    const creds: Record<string, { u: string; p: string; defaultPath: string }> = {
      PHARMACIST: { u: 'pharm_vance', p: 'PharmPass123!', defaultPath: '/dispensary' },
      NURSE: { u: 'nurse_elizabeth', p: 'NursePass123!', defaultPath: '/indents' },
      AUDITOR: { u: 'auditor_chen', p: 'AuditPass123!', defaultPath: '/audit' },
      ADMIN: { u: 'admin_sys', p: 'AdminPass123!', defaultPath: '/dispensary' },
    };

    const target = creds[newRole] || creds.PHARMACIST;
    try {
      const newSession = await api.login(target.u, target.p);
      setSession(newSession);
      setStoredSession(newSession);
      setBackendError(null);
      navigate(target.defaultPath);
    } catch (err: any) {
      setBackendError(`Auth switch error: ${err.message}`);
    }
  };

  const handleSignOut = () => {
    setStoredSession(null);
    setSession(null);
    navigate('/login');
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setStoredSession(newSession);
    const defaultPath =
      newSession.user.role === 'NURSE'
        ? '/indents'
        : newSession.user.role === 'AUDITOR'
        ? '/audit'
        : '/dispensary';
    navigate(defaultPath);
  };

  // Synchronize scenario with backend API
  const handleScenarioChange = useCallback(async (scenarioId: string, resetStage = true) => {
    const reqId = ++requestSeqRef.current;
    setSelectedScenarioId(scenarioId);
    setActiveIndent(null);
    setActiveWorkflow(null);
    setReconciliation(null);
    setBackendError(null);

    const scenario = SAMPLE_HL7_SCENARIOS.find((s) => s.id === scenarioId) || SAMPLE_HL7_SCENARIOS[0];

    // Scenario D: Malformed HL7 message type (ADT^A01)
    if (scenarioId === 'SCENARIO-INVALID-HL7') {
      try {
        await api.parseHl7(scenario.rawMessage);
      } catch (hl7Err: any) {
        if (reqId !== requestSeqRef.current) return;
        setBackendError(`HL7 Message Rejected: ${hl7Err.message}`);
        setReconciliation(null);
        if (resetStage) setCurrentStage('INDENT');
        return;
      }
    }

    try {
      const newParsed = parseOmp09Message(scenario.rawMessage);
      if (reqId !== requestSeqRef.current) return;
      setParsedOrder(newParsed);

      const doseString = `${newParsed.rxo.requestedGiveAmount} ${newParsed.rxo.requestedGiveUnits}`;
      const newDrug = await validateMedicationOrder(newParsed.rxo.requestedDrugName, doseString);
      if (reqId !== requestSeqRef.current) return;
      setValidatedDrug(newDrug);

      const newCooler = packageColdChainMedication(
        newDrug.officialName,
        newDrug.rxcui,
        newParsed.pv1.assignedLocation,
        12
      );
      setCoolerPackage(newCooler);

      const { alert, report } = await sanitizeOutboundNurseAlert(newParsed, newCooler);
      if (reqId !== requestSeqRef.current) return;
      setNurseAlert(alert);
      setHipaaReport(report);

      const newMedReq = buildFhirMedicationRequest(newParsed, newDrug);
      if (scenarioId === 'SCENARIO-DOSE-MISMATCH') {
        newMedReq.dosageInstruction = [
          {
            text: '100 UNIT via Subcutaneous Daily',
            doseAndRate: [
              {
                doseQuantity: {
                  value: 100,
                  unit: 'UNIT',
                },
              },
            ],
          },
        ];
        newMedReq.medicationCodeableConcept.text = `${newDrug.officialName} (100 UNIT)`;
      }
      setFhirMedRequest(newMedReq);

      const newMedDisp = buildFhirMedicationDispense(newMedReq, newCooler);
      setFhirMedDispense(newMedDisp);

      const newAudit = buildFhirAuditEvent(newMedDisp, report);
      setFhirAuditEvent(newAudit);

      // Execute backend 3-way reconciliation with deterministic scenario pairing
      let targetIndent: any = null;
      let fhirReqId = 'medreq-ord-2026-9042';

      if (scenarioId === 'SCENARIO-DOSE-MISMATCH') {
        fhirReqId = 'medreq-ord-2026-9042';
        const searchList = await api.getIndents({ indentNumber: 'IND-2026-9043-WRONG-DOSE' });
        targetIndent = searchList[0] || (await api.getIndents({ drug: 'Insulin', dose: '999' }))[0];
      } else if (scenarioId === 'SCENARIO-TRASTUZUMAB') {
        fhirReqId = 'medreq-ord-2026-9043';
        const searchList = await api.getIndents({ indentNumber: 'IND-2026-9044-WRONG-MED' });
        targetIndent = searchList[0] || (await api.getIndents({ drug: 'Trastuzumab', dose: '420' }))[0];
      } else {
        fhirReqId = 'medreq-ord-2026-9042';
        const searchList = await api.getIndents({ indentNumber: 'IND-2026-9042' });
        targetIndent = searchList[0] || (await api.getIndents({ drug: 'Insulin', dose: '100' }))[0];
      }

      if (!targetIndent) {
        const all = await api.getIndents();
        targetIndent =
          all.find((i: any) =>
            i.requestedDrugName?.toLowerCase().includes(newParsed.rxo.requestedDrugName.toLowerCase())
          ) || all[0];
      }

      if (reqId !== requestSeqRef.current) return;

      if (targetIndent) {
        setActiveIndent(targetIndent);
        const wfResult = await api.initiateWorkflow(
          targetIndent.id,
          scenario.rawMessage,
          fhirReqId
        );

        if (reqId !== requestSeqRef.current) return;
        setActiveWorkflow(wfResult.workflow);
        setReconciliation(wfResult.reconciliation);
      }
    } catch (err: any) {
      if (reqId !== requestSeqRef.current) return;
      setBackendError(`Integration warning: ${err.message}`);
    }

    if (resetStage && reqId === requestSeqRef.current) {
      setCurrentStage('INDENT');
    }
  }, []);

  const loadIndents = useCallback(async () => {
    try {
      const list = await api.getIndents();
      setAvailableIndents(list);
      return list;
    } catch (err) {
      console.error('Failed to load indents queue:', err);
      return [];
    }
  }, []);

  const handleSelectIndent = async (indent: any) => {
    const reqId = ++requestSeqRef.current;
    setActiveIndent(indent);
    setActiveWorkflow(null);
    setReconciliation(null);
    setBackendError(null);
    setCurrentStage('INDENT');

    const patientName = indent.patientName || 'WARREN, ELIZABETH';
    const patientMrn = indent.patientMrn || 'MRN-849201';
    const drugName = indent.requestedDrugName || 'Insulin Glargine';
    const doseVal = indent.requestedDose || '100';
    const doseUnits = indent.requestedUnits || 'UNIT';
    const wardName = indent.ward || 'Ward 4B';
    const bedName = indent.bed || 'Bed 12';
    const indentNum = indent.indentNumber || 'IND-2026-9042';

    // Format patient name for HL7 PID (e.g. "Omar Faruk" -> "FARUK^OMAR", "Warren, Elizabeth" -> "WARREN^ELIZABETH")
    let hl7PidName = 'PATIENT^UNKNOWN';
    if (patientName.includes(',')) {
      const parts = patientName.split(',').map((p: string) => p.trim().toUpperCase());
      hl7PidName = `${parts[0]}^${parts.slice(1).join('^')}`;
    } else {
      const parts = patientName.split(/\s+/).map((p: string) => p.trim().toUpperCase());
      hl7PidName = parts.length > 1 ? `${parts[parts.length - 1]}^${parts.slice(0, -1).join('^')}` : `${parts[0]}^PATIENT`;
    }

    const orderNum = `ORD-2026-${indentNum.replace(/[^0-9]/g, '').slice(-4) || '9042'}`;
    const controlId = `MSG-${indentNum}`;

    // Detect clinical safety gate test indents
    const isMedMismatch = indentNum.includes('WRONG-MED');
    const isDoseMismatch = doseVal === '999' || indentNum.includes('WRONG-DOSE');

    // For wrong med demo, bedside indent is Trastuzumab, but doctor prescribed Insulin Glargine
    const prescribedDrugName = isMedMismatch ? 'Insulin Glargine' : drugName;
    const prescribedDoseVal = isDoseMismatch ? '100' : isMedMismatch ? '100' : doseVal;
    const prescribedUnits = isMedMismatch ? 'UNIT' : doseUnits;

    // Pick official RxNorm code, route, and attending provider
    const drugLower = prescribedDrugName.toLowerCase();
    let rxNormCode = '274783';
    let routeCode = 'SC';
    let routeName = 'SUBCUTANEOUS';
    let doctorName = '10842^KAPLAN^ROBERT^M^^DR';

    if (drugLower.includes('cefazolin')) {
      rxNormCode = '2180';
      routeCode = 'IV';
      routeName = 'INTRAVENOUS';
      doctorName = '10842^KAPLAN^ROBERT^M^^DR';
    } else if (drugLower.includes('trastuzumab')) {
      rxNormCode = '228833';
      routeCode = 'IV';
      routeName = 'INTRAVENOUS';
      doctorName = '11499^CHEN^LISA^Y^^DR';
    } else if (drugLower.includes('filgrastim')) {
      rxNormCode = '214557';
      routeCode = 'SC';
      routeName = 'SUBCUTANEOUS';
      doctorName = '10512^VAZQUEZ^MARIA^G^^DR';
    } else if (drugLower.includes('amoxicillin')) {
      rxNormCode = '723';
      routeCode = 'PO';
      routeName = 'ORAL';
      doctorName = '10842^KAPLAN^ROBERT^M^^DR';
    }

    // Determine destination drop zone
    let dropZone = 'Ward 4B - Med Fridge Lockbox A';
    if (wardName.includes('7C')) {
      dropZone = 'Ward 7C - Oncology Cold Locker B';
    } else if (wardName.includes('3B')) {
      dropZone = 'Ward 3B - Pharmacy Station Lockbox C';
    } else if (wardName.includes('5A')) {
      dropZone = 'Ward 5A - BMT Clean Utility Fridge';
    } else if (wardName.includes('4B')) {
      dropZone = 'Ward 4B - Med Fridge Lockbox A';
    } else {
      dropZone = `${wardName} - Cold-Chain Lockbox`;
    }

    // Synchronize test scenarios dropdown with current indent
    if (isDoseMismatch) {
      setSelectedScenarioId('SCENARIO-DOSE-MISMATCH');
    } else if (isMedMismatch) {
      setSelectedScenarioId('SCENARIO-TRASTUZUMAB');
    } else if (drugLower.includes('filgrastim')) {
      setSelectedScenarioId('SCENARIO-FILGRASTIM');
    } else if (drugLower.includes('amoxicillin')) {
      setSelectedScenarioId('SCENARIO-AMOXICILLIN');
    } else {
      setSelectedScenarioId('SCENARIO-INSULIN');
    }

    const dynamicHl7 = [
      `MSH|^~\\&|EPIC_EHR|ST_JUDE_HOSPITAL|PHARM_DISPENSE|CENTRAL_PHARM|20260916093000||OMP^O09|${controlId}|P|2.5`,
      `PID|1||${patientMrn}^^^ST_JUDE^MR||${hl7PidName}||19800512|U|||HOSPITAL ROOM^^NEW YORK^NY`,
      `PV1|1|I|${wardName.replace(/\s+/g, '-')}^${bedName.replace(/\s+/g, '-')}||||${doctorName}|||IPD`,
      `ORC|NW|${orderNum}|||||1^ROUTINE||20260916093000|${doctorName}|||PHARMACY`,
      `RXO|${rxNormCode}^${prescribedDrugName.toUpperCase()}^RXNORM|${prescribedDoseVal}|${prescribedUnits}||||||||${routeCode}`,
      `RXR|${routeCode}^${routeName}^HL70162`,
    ].join('\r') + '\r';

    try {
      const newParsed = parseOmp09Message(dynamicHl7);
      if (reqId !== requestSeqRef.current) return;
      setParsedOrder(newParsed);

      const doseString = `${prescribedDoseVal} ${prescribedUnits}`;
      const newDrug = await validateMedicationOrder(prescribedDrugName, doseString);
      if (reqId !== requestSeqRef.current) return;
      setValidatedDrug(newDrug);

      const newCooler = packageColdChainMedication(
        newDrug.officialName,
        newDrug.rxcui,
        `${wardName} ${bedName}`,
        10
      );
      setCoolerPackage(newCooler);

      const { alert, report } = await sanitizeOutboundNurseAlert(newParsed, newCooler);
      if (reqId !== requestSeqRef.current) return;
      alert.destinationDropZone = dropZone;
      setNurseAlert(alert);
      setHipaaReport(report);

      const newMedReq = buildFhirMedicationRequest(newParsed, newDrug);
      newMedReq.subject = {
        reference: `Patient/${patientMrn}`,
        display: patientName,
      };
      if (isDoseMismatch) {
        newMedReq.dosageInstruction = [
          {
            text: '100 UNIT via Subcutaneous Daily',
            doseAndRate: [{ doseQuantity: { value: 100, unit: 'UNIT' } }],
          },
        ];
        newMedReq.medicationCodeableConcept.text = `${newDrug.officialName} (100 UNIT)`;
      } else if (isMedMismatch) {
        newMedReq.dosageInstruction = [
          {
            text: '100 UNIT via Subcutaneous Daily',
            doseAndRate: [{ doseQuantity: { value: 100, unit: 'UNIT' } }],
          },
        ];
        newMedReq.medicationCodeableConcept.text = 'Insulin Glargine 100 UNIT';
      }
      setFhirMedRequest(newMedReq);

      const newMedDisp = buildFhirMedicationDispense(newMedReq, newCooler);
      setFhirMedDispense(newMedDisp);

      const newAudit = buildFhirAuditEvent(newMedDisp, report);
      setFhirAuditEvent(newAudit);

      // Trigger backend workflow initiation and reconciliation for this patient indent
      const fhirReqId = `medreq-${indentNum}`;
      
      // Fetch live authentic FHIR MedicationRequest from HAPI FHIR server via backend
      try {
        const liveFhirReq = await api.getFhirMedicationRequest(fhirReqId);
        if (liveFhirReq?.rawResource && reqId === requestSeqRef.current) {
          setFhirMedRequest(liveFhirReq.rawResource);
        }
      } catch (fhirErr: any) {
        console.warn('FHIR live MedicationRequest query notice:', fhirErr.message);
      }

      // Fetch live RxNorm concept resolution via backend NIH NLM API
      try {
        const liveRxNorm = await api.validateRxNorm(prescribedDrugName, doseString);
        if (liveRxNorm?.rxcui && reqId === requestSeqRef.current) {
          setValidatedDrug(liveRxNorm);
        }
      } catch (rxErr: any) {
        console.warn('RxNav live query notice:', rxErr.message);
      }

      const wfResult = await api.initiateWorkflow(
        indent.id,
        dynamicHl7,
        fhirReqId
      );

      if (reqId !== requestSeqRef.current) return;
      setActiveWorkflow(wfResult.workflow);
      setReconciliation(wfResult.reconciliation);
    } catch (err: any) {
      if (reqId !== requestSeqRef.current) return;
      console.warn('Patient indent clinical workflow sync warning:', err.message);
    }
  };

  // Re-fetch indents whenever route changes or query param arrives
  useEffect(() => {
    if (session) {
      loadIndents().then((list) => {
        if (!list || list.length === 0) return;

        const searchParams = new URLSearchParams(location.search);
        const targetIndentNumber = searchParams.get('indentNumber');
        const targetMrn = searchParams.get('mrn');

        let matched = null;
        if (targetIndentNumber) {
          matched = list.find((i: any) => i.indentNumber === targetIndentNumber);
        } else if (targetMrn) {
          matched = list.find((i: any) => i.patientMrn === targetMrn);
        }

        if (matched) {
          handleSelectIndent(matched);
        } else if (!hasInitialized.current) {
          hasInitialized.current = true;
          // Do not auto-select first item; allow pharmacist to see the empty state and select deliberately
        } else if (activeIndent) {
          const refreshed = list.find((i: any) => i.id === activeIndent.id || i.indentNumber === activeIndent.indentNumber);
          if (refreshed && refreshed.status !== activeIndent.status) {
            setActiveIndent(refreshed);
          }
        }
      });
    }
  }, [session, location.pathname, location.search]);

  // Real-time broadcast listener across all workstations
  useEffect(() => {
    const handleIndentsUpdate = () => {
      loadIndents().then((list) => {
        if (list && activeIndent) {
          const refreshed = list.find((i: any) => i.id === activeIndent.id || i.indentNumber === activeIndent.indentNumber);
          if (refreshed) {
            setActiveIndent(refreshed);
          }
        }
      });
    };
    window.addEventListener('dna-health-indents-updated', handleIndentsUpdate);
    return () => window.removeEventListener('dna-health-indents-updated', handleIndentsUpdate);
  }, [loadIndents, activeIndent]);

  const handleDrugUpdated = async (newDrug: ValidatedDrugInfo) => {
    setValidatedDrug(newDrug);
    const newCooler = packageColdChainMedication(
      newDrug.officialName,
      newDrug.rxcui,
      parsedOrder.pv1.assignedLocation,
      coolerPackage.courier.estimatedArrivalMinutes
    );
    setCoolerPackage(newCooler);

    const newMedReq = buildFhirMedicationRequest(parsedOrder, newDrug);
    setFhirMedRequest(newMedReq);

    const newMedDisp = buildFhirMedicationDispense(newMedReq, newCooler);
    setFhirMedDispense(newMedDisp);

    const newAudit = buildFhirAuditEvent(newMedDisp, hipaaReport);
    setFhirAuditEvent(newAudit);
  };

  const handleTempUpdate = (newTemp: number) => {
    const updatedCooler = {
      ...coolerPackage,
      currentTempCelsius: newTemp,
      telemetryStatus: newTemp < 2.0 ? ('EXCURSION_LOW' as const) : newTemp > 8.0 ? ('EXCURSION_HIGH' as const) : ('NOMINAL' as const)
    };
    setCoolerPackage(updatedCooler);

    const updatedDispense = buildFhirMedicationDispense(fhirMedRequest, updatedCooler);
    setFhirMedDispense(updatedDispense);
  };

  const handleAuthorizeFulfillment = async (): Promise<boolean> => {
    setIsFulfilling(true);
    setBackendError(null);

    try {
      let workflowToFulfill = activeWorkflow;

      // If activeWorkflow is not ready or null, initiate it on the fly for the active indent
      if (!workflowToFulfill?.id && activeIndent?.id && parsedOrder) {
        const indentNum = activeIndent.indentNumber || 'IND-2026-9042';
        const fhirReqId = `medreq-${indentNum}`;
        try {
          const initResult = await api.initiateWorkflow(
            activeIndent.id,
            parsedOrder.rawMessage,
            fhirReqId
          );
          workflowToFulfill = initResult.workflow;
          setActiveWorkflow(initResult.workflow);
          setReconciliation(initResult.reconciliation);
        } catch (initErr: any) {
          console.warn('Auto-initiate workflow notice:', initErr.message);
        }
      }

      if (workflowToFulfill?.status === 'DISPATCHED') {
        setActiveIndent((prev: any) => (prev ? { ...prev, status: 'DISPATCHED' } : prev));
        setCurrentStage('NURSE_NOTIFIED');
        setIsFulfilling(false);
        return true;
      }

      let result: any = null;
      if (workflowToFulfill?.id) {
        result = await api.fulfillWorkflow(workflowToFulfill.id);
        setActiveWorkflow(result.workflow);
        if (result.fhirDispenseId) {
          setFhirMedDispense((prev) => ({
            ...prev,
            id: result.fhirDispenseId,
          }));
        }
      }

      // Always reload indents and ensure local state is marked DISPATCHED
      const updatedList = await loadIndents();
      setActiveIndent((prev: any) => {
        if (!prev) return prev;
        const found = updatedList?.find((i: any) => i.id === prev.id || i.indentNumber === prev.indentNumber);
        return found || { ...prev, status: 'DISPATCHED' };
      });
      setCurrentStage('NURSE_NOTIFIED');

      // Dispatch cross-page sync event
      window.dispatchEvent(new CustomEvent('dna-health-indents-updated'));

      // Notify both pharmacist and nurse
      const orderRef = result?.workflow?.workflowNumber || workflowToFulfill?.workflowNumber || activeIndent?.indentNumber || 'WF-UNKNOWN';
      notifyPharmacistFulfilled(orderRef);
      notifyNurseDispatch(orderRef, 'James Miller (COUR-409)', 10);
      return true;
    } catch (err: any) {
      console.error('Authorize fulfillment error:', err);
      setBackendError(`Fulfillment error: ${err.message}`);
      return false;
    } finally {
      setIsFulfilling(false);
    }
  };

  const handleRecoverWorkflow = async () => {
    if (!activeWorkflow?.id) return;
    try {
      const result = await api.recoverWorkflow(activeWorkflow.id);
      setActiveWorkflow(result.workflow);
      if (result.fhirDispenseId) {
        setFhirMedDispense((prev) => ({
          ...prev,
          id: result.fhirDispenseId,
        }));
      }
      setBackendError(null);
    } catch (err: any) {
      setBackendError(`Recovery failed: ${err.message}`);
    }
  };

  // If on /login, render login page
  if (location.pathname === '/login') {
    if (session) {
      const home =
        session.user.role === 'NURSE'
          ? '/indents'
          : session.user.role === 'AUDITOR'
          ? '/audit'
          : '/dispensary';
      return <Navigate to={home} replace />;
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If unauthenticated on any other route, redirect to /login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isColdChainExcursion = coolerPackage.currentTempCelsius < 2.0 || coolerPackage.currentTempCelsius > 8.0;
  const isIndentDone = Boolean(parsedOrder && activeWorkflow);
  const isRxNormDone = validatedDrug.validationStatus === 'MATCHED_OFFICIAL' || validatedDrug.formulationMatch?.status === 'EXACT_MATCH';
  const isReconciliationDone = reconciliation?.overallStatus === 'PASSED';
  const isDispatched = activeWorkflow?.status === 'DISPATCHED' || activeIndent?.status === 'DISPATCHED';
  const isDispensing = activeWorkflow?.status === 'DISPENSING';
  const isNurseNotified = Boolean(isDispatched);
  const isFhirRecorded = Boolean(activeWorkflow?.fhirMedicationDispenseId);

  const stageStatuses: StageStatusMap = {
    INDENT: isIndentDone,
    RXNORM_VALIDATED: isRxNormDone,
    HL7_PARSED: isReconciliationDone,
    PACKED_DISPATCHED: isDispatched || isDispensing,
    NURSE_NOTIFIED: isNurseNotified,
    FHIR_RECORDED: isFhirRecorded,
  };

  const reconciliationFailed = reconciliation?.overallStatus === 'FAILED';
  const maxAccessibleIndex =
    backendError?.includes('HL7 Message Rejected')
      ? 0
      : reconciliationFailed
      ? 2
      : 5;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* 1. Left Hospital Sidebar */}
      <Sidebar
        practitionerName={session.user.fullName}
        currentRole={session.user.role}
        onRoleChange={handleRoleChange}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Workstation Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Slim Hospital Navbar (48px) */}
        <Navbar
          isColdChainActive={validatedDrug.isRefrigeratedColdChain}
          currentTemp={coolerPackage.currentTempCelsius}
          practitionerName={session.user.fullName}
          currentRole={session.user.role}
          onSignOut={handleSignOut}
        />

        {/* Scrollable Workstation Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem 3rem 1.75rem' }}>
          <div style={{ maxWidth: '1150px', margin: '0 auto', width: '100%' }}>
            {/* Backend Error / Safety Alert Banner */}
            {backendError && (
              <div style={{
                backgroundColor: 'var(--accent-red-light)',
                border: '1px solid var(--accent-red-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                color: 'var(--accent-red)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>{backendError}</span>
                <button
                  onClick={() => setBackendError(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ROUTED WORKSTATIONS */}
            <Routes>
              {/* Root redirect based on active persona */}
              <Route
                path="/"
                element={
                  session.user.role === 'NURSE' ? (
                    <Navigate to="/indents" replace />
                  ) : session.user.role === 'AUDITOR' ? (
                    <Navigate to="/audit" replace />
                  ) : (
                    <Navigate to="/dispensary" replace />
                  )
                }
              />

              {/* Workstation 1: Dispensary Pipeline (Protected: PHARMACIST, ADMIN) */}
              <Route
                path="/dispensary"
                element={
                  <ProtectedRoute session={session} allowedRoles={['PHARMACIST', 'ADMIN']}>
                    {dispensaryViewMode === 'UNIFIED' ? (
                      <UnifiedDispensaryWorkstation
                        parsedOrder={parsedOrder}
                        fhirMedRequest={fhirMedRequest}
                        fhirMedDispense={fhirMedDispense}
                        fhirAuditEvent={fhirAuditEvent}
                        coolerPackage={coolerPackage}
                        reconciliation={reconciliation}
                        reconciliationFailed={reconciliationFailed}
                        nurseAlert={nurseAlert}
                        hipaaReport={hipaaReport}
                        validatedDrug={validatedDrug}
                        availableIndents={availableIndents}
                        activeIndent={activeIndent}
                        onSelectIndent={handleSelectIndent}
                        onClearSelection={() => setActiveIndent(null)}
                        selectedScenarioId={selectedScenarioId}
                        onSelectScenario={handleScenarioChange}
                        scenarios={SAMPLE_HL7_SCENARIOS}
                        onAuthorizeFulfillment={handleAuthorizeFulfillment}
                        isFulfilling={isFulfilling}
                        isDispatched={isDispatched}
                        onUpdateTemp={handleTempUpdate}
                        isColdChainExcursion={isColdChainExcursion}
                        pharmacistName={session.user.fullName}
                        activeWorkflow={activeWorkflow}
                        backendError={backendError}
                        onClearBackendError={() => setBackendError(null)}
                        onSwitchToStepper={() => setDispensaryViewMode('STEPPER')}
                      />
                    ) : (
                      <>
                        {/* Stepper View Switch Banner */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '0.65rem 1rem',
                            marginBottom: '1rem',
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>
                            Step-by-Step Pipeline Demonstration Mode
                          </span>
                          <button
                            onClick={() => setDispensaryViewMode('UNIFIED')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                          >
                            Return to Unified Workstation (Recommended)
                          </button>
                        </div>

                        {/* Dispensary Command Center Dashboard */}
                        <DispensaryDashboard
                          currentTemp={coolerPackage.currentTempCelsius}
                          isColdChainExcursion={isColdChainExcursion}
                          availableIndents={availableIndents}
                          activeIndent={activeIndent}
                          onSelectIndent={handleSelectIndent}
                          isDispatched={isDispatched}
                          pharmacistName={session.user.fullName}
                        />

                        {/* Stepper with Safety Gate Navigation Lock */}
                        <PipelineTimeline
                          currentStage={currentStage}
                          onSelectStage={(stage) => setCurrentStage(stage)}
                          isExcursion={isColdChainExcursion}
                          maxAccessibleIndex={maxAccessibleIndex}
                          stageStatuses={stageStatuses}
                          reconciliationFailed={reconciliationFailed}
                        />

                        {/* Structured Clinical Reconciliation Safety Alert Card */}
                        {reconciliationFailed && reconciliation && (
                          <div
                            style={{
                              backgroundColor: '#fff5f5',
                              border: '1px solid #fed7d7',
                              borderLeft: '4px solid var(--accent-red)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.9rem 1.15rem',
                              marginBottom: '1.25rem',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                                  Clinical Reconciliation Safety Hold
                                </span>
                                <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>
                                  Safety Gate Enforced &middot; Fulfillment Blocked
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Automatic fail-closed per hospital protocol
                              </span>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.55rem 0' }}>
                              A 3-way concordance discrepancy was detected between Bedside Indent, EHR FHIR Prescription, and HL7 Order Feed. Central Dispensary dispatch is locked until the ordering provider resolves the discrepancy.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {reconciliation.discrepancies.map((disc, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #fee2e2',
                                    borderRadius: '4px',
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.76rem',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '0.5rem',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '3px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Discrepancy {idx + 1}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#991b1b', wordBreak: 'break-word' }}>
                                    {disc}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Step 1: Doctor's Order & Inpatient Floor Indent Double-Check */}
                        {currentStage === 'INDENT' && (
                          <PrescriptionCard
                            scenarios={SAMPLE_HL7_SCENARIOS}
                            selectedScenarioId={selectedScenarioId}
                            onSelectScenario={handleScenarioChange}
                            parsedOrder={parsedOrder}
                            fhirMedRequest={fhirMedRequest}
                            onProceedToValidation={() => setCurrentStage('RXNORM_VALIDATED')}
                            activeIndent={activeIndent}
                            availableIndents={availableIndents}
                            onSelectIndent={handleSelectIndent}
                          />
                        )}

                        {/* Step 2: NIH NLM RxNav / RxNorm Formulation Validation */}
                        {currentStage === 'RXNORM_VALIDATED' && (
                          <RxNavValidator
                            validatedDrug={validatedDrug}
                            onDrugUpdated={handleDrugUpdated}
                            onBack={() => setCurrentStage('INDENT')}
                            onProceedToHl7={() => setCurrentStage('HL7_PARSED')}
                          />
                        )}

                        {/* Step 3: HL7 v2 OMP^O09 & 3-Way Reconciliation */}
                        {currentStage === 'HL7_PARSED' && (
                          <HL7v2Viewer
                            parsedOrder={parsedOrder}
                            onBack={() => setCurrentStage('RXNORM_VALIDATED')}
                            onProceedToDispatch={() => setCurrentStage('PACKED_DISPATCHED')}
                            reconciliation={reconciliation}
                          />
                        )}

                        {/* Step 4: Cold-Chain Packaging & Courier Dispatch */}
                        {currentStage === 'PACKED_DISPATCHED' && (
                          <ColdChainCard
                            coolerPackage={coolerPackage}
                            onUpdateTemp={handleTempUpdate}
                            onBack={() => setCurrentStage('HL7_PARSED')}
                            onProceedToHipaa={handleAuthorizeFulfillment}
                            isFulfilling={isFulfilling}
                            isDispatched={isDispatched}
                          />
                        )}

                        {/* Step 5: HIPAA Safe Harbor De-Identification Engine & Notification */}
                        {currentStage === 'NURSE_NOTIFIED' && (
                          <HipaaGuardCard
                            parsedOrder={parsedOrder}
                            nurseAlert={nurseAlert}
                            hipaaReport={hipaaReport}
                            onBack={() => setCurrentStage('PACKED_DISPATCHED')}
                            onProceedToFhir={() => setCurrentStage('FHIR_RECORDED')}
                          />
                        )}

                        {/* Step 6: HL7 FHIR R4 Record Viewer */}
                        {currentStage === 'FHIR_RECORDED' && (
                          <FhirJsonViewer
                            medicationRequest={fhirMedRequest}
                            medicationDispense={fhirMedDispense}
                            auditEvent={fhirAuditEvent}
                            activeWorkflow={activeWorkflow}
                            onBack={() => setCurrentStage('NURSE_NOTIFIED')}
                            onRecoverWorkflow={handleRecoverWorkflow}
                          />
                        )}
                      </>
                    )}
                  </ProtectedRoute>
                }
              />

              {/* Workstation 2: Nurse Requests (Protected: NURSE, ADMIN) */}
              <Route
                path="/indents"
                element={
                  <ProtectedRoute session={session} allowedRoles={['NURSE', 'ADMIN']}>
                    <NurseDesk session={session} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nurse"
                element={
                  <ProtectedRoute session={session} allowedRoles={['NURSE', 'ADMIN']}>
                    <NurseDesk session={session} />
                  </ProtectedRoute>
                }
              />

              {/* Workstation 3: Order Records (Protected: PHARMACIST, ADMIN) */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute session={session} allowedRoles={['PHARMACIST', 'ADMIN']}>
                    <OrderRecords
                      parsedOrder={parsedOrder}
                      fhirMedRequest={fhirMedRequest}
                      fhirMedDispense={fhirMedDispense}
                      fhirAuditEvent={fhirAuditEvent}
                      scenarios={SAMPLE_HL7_SCENARIOS}
                      selectedScenarioId={selectedScenarioId}
                      onSelectScenario={handleScenarioChange}
                      availableIndents={availableIndents}
                      activeWorkflow={activeWorkflow}
                      onSelectIndent={handleSelectIndent}
                    />
                  </ProtectedRoute>
                }
              />

              {/* Workstation 4: Audit Vault (Protected: AUDITOR, ADMIN) */}
              <Route
                path="/audit"
                element={
                  <ProtectedRoute session={session} allowedRoles={['AUDITOR', 'ADMIN']}>
                    <AuditorVault session={session} />
                  </ProtectedRoute>
                }
              />

              {/* Workstation 5: Operating Room Surgical Safety Checklist (Protected: PHARMACIST, NURSE, AUDITOR, ADMIN) */}
              <Route
                path="/surgery"
                element={
                  <ProtectedRoute session={session} allowedRoles={['PHARMACIST', 'NURSE', 'AUDITOR', 'ADMIN']}>
                    <SurgicalSafetyWorkstation session={session} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeout"
                element={
                  <ProtectedRoute session={session} allowedRoles={['PHARMACIST', 'NURSE', 'AUDITOR', 'ADMIN']}>
                    <SurgicalSafetyWorkstation session={session} />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

// Root Application wrapped with BrowserRouter
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
