import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Omp09ParsedOrder,
  FhirMedicationRequest,
  FhirMedicationDispense,
  FhirAuditEvent,
  ValidatedDrugInfo,
  DeIdentifiedNurseAlert,
  HipaaSanitizationReport,
} from '../types/clinical';
import { SampleHl7Scenario } from '../data/sampleHl7Messages';
import { CoolerPackage } from '../services/coldChainService';
import { ReconciliationSummary } from './HL7v2Viewer';
import {
  DispensaryHeader,
  DispatchedDossierBanner,
  DispensaryStepper,
  DispensaryMedicationQueue,
  DispensaryEmptyState,
  DispensaryCertificationFooter,
  Step1ReadPrescription,
  Step2ValidateDrug,
  Step3ProcessDelivery,
  Step4ApproveDispatch,
  Step5HipaaCompliance,
  DispensaryStepItem,
} from './dispensary';

export interface UnifiedDispensaryWorkstationProps {
  parsedOrder: Omp09ParsedOrder;
  fhirMedRequest: FhirMedicationRequest;
  fhirMedDispense: FhirMedicationDispense;
  fhirAuditEvent: FhirAuditEvent;
  coolerPackage: CoolerPackage;
  reconciliation: ReconciliationSummary | null;
  reconciliationFailed: boolean;
  nurseAlert: DeIdentifiedNurseAlert;
  hipaaReport: HipaaSanitizationReport;
  validatedDrug: ValidatedDrugInfo;
  availableIndents: any[];
  activeIndent: any;
  onSelectIndent: (indent: any) => void;
  onClearSelection?: () => void;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  scenarios: SampleHl7Scenario[];
  onAuthorizeFulfillment: () => Promise<boolean>;
  isFulfilling: boolean;
  isDispatched: boolean;
  onUpdateTemp: (temp: number) => void;
  isColdChainExcursion: boolean;
  pharmacistName: string;
  activeWorkflow: any;
  backendError?: string | null;
  onClearBackendError?: () => void;
  onSwitchToStepper?: () => void;
}

export const UnifiedDispensaryWorkstation: React.FC<UnifiedDispensaryWorkstationProps> = ({
  parsedOrder,
  fhirMedRequest,
  fhirMedDispense,
  fhirAuditEvent,
  coolerPackage,
  reconciliation,
  reconciliationFailed,
  nurseAlert,
  hipaaReport,
  validatedDrug,
  availableIndents,
  activeIndent,
  onSelectIndent,
  onClearSelection,
  selectedScenarioId,
  onSelectScenario,
  scenarios,
  onAuthorizeFulfillment,
  isFulfilling,
  isDispatched,
  onUpdateTemp,
  isColdChainExcursion,
  pharmacistName,
  activeWorkflow,
  backendError,
  onClearBackendError,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [dispatchedViewMode, setDispatchedViewMode] = useState<'ALL_INFO' | 'STEP_BY_STEP'>('ALL_INFO');
  const [unlockedStepByOrder, setUnlockedStepByOrder] = useState<Record<string, number>>({});
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');
  const [showTempControls, setShowTempControls] = useState(false);
  const [expandedJson, setExpandedJson] = useState<Record<string, boolean>>({});
  const [stepNotice, setStepNotice] = useState<string | null>(null);

  const toggleJson = (key: string) => {
    setExpandedJson((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Prescribed dose & units
  const prescribedDose =
    fhirMedRequest.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value?.toString() ||
    parsedOrder.rxo.requestedGiveAmount ||
    '100';
  const prescribedUnits =
    fhirMedRequest.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit ||
    parsedOrder.rxo.requestedGiveUnits ||
    'UNIT';

  // Nurse requested dose & units
  const requestedDose = activeIndent?.requestedDose || parsedOrder.rxo.requestedGiveAmount || '100';
  const requestedUnits = activeIndent?.requestedUnits || parsedOrder.rxo.requestedGiveUnits || 'UNIT';
  const requestedDrug = activeIndent?.requestedDrugName || parsedOrder.rxo.requestedDrugName;
  const prescribedDrug = fhirMedRequest.medicationCodeableConcept?.text || parsedOrder.rxo.requestedDrugName;

  // Real-time clinical drug matching with deterministic scenario guards
  const isScenarioDoseMismatch =
    selectedScenarioId === 'SCENARIO-DOSE-MISMATCH' ||
    Boolean(activeIndent?.indentNumber?.includes('WRONG-DOSE')) ||
    requestedDose.trim() !== prescribedDose.trim();

  const isScenarioMedMismatch =
    selectedScenarioId === 'SCENARIO-TRASTUZUMAB' ||
    Boolean(activeIndent?.indentNumber?.includes('WRONG-MED'));

  const reqLower = (requestedDrug || '').toLowerCase().trim();
  const presLower = (prescribedDrug || '').toLowerCase().trim();
  const isDrugMatch =
    !isScenarioMedMismatch &&
    (reqLower === presLower ||
      presLower.includes(reqLower) ||
      reqLower.includes(presLower) ||
      (reqLower.includes('insulin') && presLower.includes('insulin')) ||
      (reqLower.includes('cefazolin') && presLower.includes('cefazolin')) ||
      (reqLower.includes('filgrastim') && presLower.includes('filgrastim')) ||
      (reqLower.includes('trastuzumab') && presLower.includes('trastuzumab')) ||
      (reqLower.includes('amoxicillin') && presLower.includes('amoxicillin')));

  const isDoseMatch = !isScenarioDoseMismatch;
  const concordancePassed = !reconciliationFailed && isDrugMatch && isDoseMatch;

  const isOrderDispatched =
    isDispatched || activeIndent?.status === 'DISPATCHED' || activeWorkflow?.status === 'DISPATCHED';
  const isAllInfoView = Boolean(isOrderDispatched && dispatchedViewMode === 'ALL_INFO');

  // Identify order key for order-specific step progression
  const orderKey = activeIndent?.id || activeIndent?.indentNumber || selectedScenarioId || 'default';

  // Clinical Step Gating: Progression must be strictly sequential per request
  const maxUnlockedStep = useMemo(() => {
    const recordedProgress = unlockedStepByOrder[orderKey] || 1;
    if (!concordancePassed && recordedProgress > 3) {
      return 3;
    }
    return recordedProgress;
  }, [unlockedStepByOrder, orderKey, concordancePassed]);

  const isStepAccessible = (stepNum: number) => {
    return stepNum <= maxUnlockedStep;
  };

  // 5 Step definitions mapped 1:1 to case requirements
  const steps: DispensaryStepItem[] = [
    {
      num: 1,
      title: 'Read Prescription',
      standard: 'FHIR MedicationRequest',
      badge: 'Step 1',
      isComplete: maxUnlockedStep > 1,
      hasError: false,
    },
    {
      num: 2,
      title: 'Validate Drug',
      standard: 'NIH RxNorm',
      badge: 'Step 2',
      isComplete: maxUnlockedStep > 2,
      hasError: false,
    },
    {
      num: 3,
      title: 'Process Delivery',
      standard: 'HL7 v2 & 3-Way Check',
      badge: 'Step 3',
      isComplete: maxUnlockedStep > 3 && concordancePassed,
      hasError: !concordancePassed && (activeStep >= 3 || maxUnlockedStep >= 3),
    },
    {
      num: 4,
      title: 'Approve & Dispatch',
      standard: 'Cold Chain & FHIR Dispense',
      badge: 'Step 4',
      isComplete: isOrderDispatched && maxUnlockedStep >= 5,
      hasError: isColdChainExcursion && activeStep === 4,
    },
    {
      num: 5,
      title: 'HIPAA Compliance',
      standard: 'Safe Harbor & AuditEvent',
      badge: 'Step 5',
      isComplete: isOrderDispatched && maxUnlockedStep >= 5,
      hasError: false,
    },
  ];

  // When request/indent changes OR scenario changes, strictly reset to Step 1 (or All Info if dispatched)
  const currentOrderIdentifier = `${activeIndent?.id || activeIndent?.indentNumber || ''}-${selectedScenarioId || ''}`;
  const lastOrderIdentifierRef = useRef<string>(currentOrderIdentifier);

  useEffect(() => {
    if (currentOrderIdentifier && currentOrderIdentifier !== lastOrderIdentifierRef.current) {
      lastOrderIdentifierRef.current = currentOrderIdentifier;
      if (isOrderDispatched) {
        setDispatchedViewMode('ALL_INFO');
      } else {
        setActiveStep(1);
      }
      setStepNotice(null);
    }
  }, [currentOrderIdentifier, isOrderDispatched]);

  const handleStepClick = (targetStep: number) => {
    if (targetStep === activeStep) return;

    if (!isStepAccessible(targetStep)) {
      if (targetStep >= 4 && !concordancePassed) {
        setStepNotice(
          '🔒 Step 4 (Approve & Dispatch) is locked: 3-Way Reconciliation failed concordance. Dispensing is prohibited by clinical safety hold.'
        );
      } else if (targetStep === 5 && !isOrderDispatched) {
        setStepNotice(
          '🔒 Step 5 (HIPAA Compliance & Audit) is locked: The medication must be approved and dispatched in Step 4 before delivery notifications and audit records are generated.'
        );
      } else if (targetStep === 2) {
        setStepNotice(
          '🔒 Step 2 (Validate Drug) is locked: Verification is sequential. Please verify the prescription in Step 1 first.'
        );
      } else if (targetStep === 3) {
        setStepNotice(
          '🔒 Step 3 (Process Delivery) is locked: Verification is sequential. Please confirm drug formulation in Step 2 first.'
        );
      } else {
        setStepNotice(
          `🔒 Step ${targetStep} is locked: Verification steps must be completed sequentially. Please complete Step ${
            targetStep - 1
          } first.`
        );
      }
      setTimeout(() => setStepNotice(null), 6000);
      return;
    }

    setStepNotice(null);
    setActiveStep(targetStep);
  };

  const handleAdvanceToStep = (targetStep: number) => {
    setUnlockedStepByOrder((prev) => ({
      ...prev,
      [orderKey]: Math.max(prev[orderKey] || 1, targetStep),
    }));
    setActiveStep(targetStep);
    setStepNotice(null);
  };

  const handleSelectFirstPending = () => {
    const firstPending = availableIndents.find((i) => i.status === 'PENDING') || availableIndents[0];
    if (firstPending) {
      onSelectIndent(firstPending);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* 1. TOP HEADER & TELEMETRY */}
      <DispensaryHeader
        coolerPackage={coolerPackage}
        isColdChainExcursion={isColdChainExcursion}
        showTempControls={showTempControls}
        onToggleTempControls={() => setShowTempControls(!showTempControls)}
        onUpdateTemp={onUpdateTemp}
        pharmacistName={pharmacistName}
        backendError={backendError || null}
        onClearBackendError={onClearBackendError || (() => {})}
      />

      {/* 2. PROGRESS PIPELINE OR DISPATCHED DOSSIER BANNER (Only when a patient request is active) */}
      {activeIndent && (
        <>
          {isAllInfoView ? (
            <DispatchedDossierBanner
              onViewBySteps={() => setDispatchedViewMode('STEP_BY_STEP')}
              coolerPackage={coolerPackage}
            />
          ) : (
            <DispensaryStepper
              steps={steps}
              activeStep={activeStep}
              maxUnlockedStep={maxUnlockedStep}
              isStepAccessible={isStepAccessible}
              stepNotice={stepNotice}
              onClearStepNotice={() => setStepNotice(null)}
              onStepClick={handleStepClick}
              isOrderDispatched={isOrderDispatched}
              onShowAllInfo={() => setDispatchedViewMode('ALL_INFO')}
            />
          )}
        </>
      )}

      {/* 3. TWO-COLUMN WORKSTATION BODY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 340px) minmax(0, 1fr)',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: MEDICATION QUEUE & SCENARIOS */}
        <DispensaryMedicationQueue
          availableIndents={availableIndents}
          activeIndent={activeIndent}
          onSelectIndent={onSelectIndent}
          onClearSelection={onClearSelection}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={onSelectScenario}
          scenarios={scenarios}
          queueSearch={queueSearch}
          onSearchChange={setQueueSearch}
          queueFilter={queueFilter}
          onFilterChange={setQueueFilter}
        />

        {/* RIGHT COLUMN: EMPTY STATE OR STEP VERIFICATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {!activeIndent ? (
            /* Requirement: When no patient is selected, do NOT show steps. Show clean clinical guidance. */
            <DispensaryEmptyState
              availableIndents={availableIndents}
              onSelectFirstPending={handleSelectFirstPending}
              onSelectScenario={onSelectScenario}
            />
          ) : isAllInfoView ? (
            /* Complete Clinical Dossier: All 5 sections rendered simultaneously with certified audit seal */
            <>
              <Step1ReadPrescription
                isAllInfoView={true}
                activeIndent={activeIndent}
                parsedOrder={parsedOrder}
                fhirMedRequest={fhirMedRequest}
                prescribedDose={prescribedDose}
                prescribedUnits={prescribedUnits}
                orderKey={orderKey}
                expandedJson={expandedJson}
                onToggleJson={toggleJson}
              />
              <Step2ValidateDrug
                isAllInfoView={true}
                validatedDrug={validatedDrug}
                prescribedDrug={prescribedDrug}
                orderKey={orderKey}
              />
              <Step3ProcessDelivery
                isAllInfoView={true}
                parsedOrder={parsedOrder}
                activeIndent={activeIndent}
                fhirMedRequest={fhirMedRequest}
                concordancePassed={concordancePassed}
                requestedDrug={requestedDrug}
                requestedDose={requestedDose}
                requestedUnits={requestedUnits}
                prescribedDrug={prescribedDrug}
                prescribedDose={prescribedDose}
                prescribedUnits={prescribedUnits}
                orderKey={orderKey}
                reconciliation={reconciliation}
                expandedJson={expandedJson}
                onToggleJson={toggleJson}
              />
              <Step4ApproveDispatch
                isAllInfoView={true}
                coolerPackage={coolerPackage}
                isColdChainExcursion={isColdChainExcursion}
                concordancePassed={concordancePassed}
                isOrderDispatched={isOrderDispatched}
                isFulfilling={isFulfilling}
                onAuthorizeFulfillment={onAuthorizeFulfillment}
                fhirMedDispense={fhirMedDispense}
                pharmacistName={pharmacistName}
                orderKey={orderKey}
                nurseAlert={nurseAlert}
                backendError={backendError}
                onClearBackendError={onClearBackendError}
                expandedJson={expandedJson}
                onToggleJson={toggleJson}
              />
              <Step5HipaaCompliance
                isAllInfoView={true}
                hipaaReport={hipaaReport}
                nurseAlert={nurseAlert}
                fhirAuditEvent={fhirAuditEvent}
                isOrderDispatched={isOrderDispatched}
                activeWorkflow={activeWorkflow}
                activeIndent={activeIndent}
                pharmacistName={pharmacistName}
                expandedJson={expandedJson}
                onToggleJson={toggleJson}
              />
              <DispensaryCertificationFooter pharmacistName={pharmacistName} />
            </>
          ) : (
            /* Sequential Verification Pipeline (Steps 1 through 5) */
            <>
              {activeStep === 1 && (
                <Step1ReadPrescription
                  isAllInfoView={false}
                  activeIndent={activeIndent}
                  parsedOrder={parsedOrder}
                  fhirMedRequest={fhirMedRequest}
                  prescribedDose={prescribedDose}
                  prescribedUnits={prescribedUnits}
                  orderKey={orderKey}
                  onAdvanceToStep2={() => handleAdvanceToStep(2)}
                  expandedJson={expandedJson}
                  onToggleJson={toggleJson}
                />
              )}

              {activeStep === 2 && (
                <Step2ValidateDrug
                  isAllInfoView={false}
                  validatedDrug={validatedDrug}
                  prescribedDrug={prescribedDrug}
                  orderKey={orderKey}
                  onAdvanceToStep3={() => handleAdvanceToStep(3)}
                  onBackToStep1={() => {
                    setActiveStep(1);
                    setStepNotice(null);
                  }}
                />
              )}

              {activeStep === 3 && (
                <Step3ProcessDelivery
                  isAllInfoView={false}
                  parsedOrder={parsedOrder}
                  activeIndent={activeIndent}
                  fhirMedRequest={fhirMedRequest}
                  concordancePassed={concordancePassed}
                  requestedDrug={requestedDrug}
                  requestedDose={requestedDose}
                  requestedUnits={requestedUnits}
                  prescribedDrug={prescribedDrug}
                  prescribedDose={prescribedDose}
                  prescribedUnits={prescribedUnits}
                  orderKey={orderKey}
                  reconciliation={reconciliation}
                  onAdvanceToStep4={() => handleAdvanceToStep(4)}
                  onBackToStep2={() => {
                    setActiveStep(2);
                    setStepNotice(null);
                  }}
                  expandedJson={expandedJson}
                  onToggleJson={toggleJson}
                />
              )}

              {activeStep === 4 && (
                <Step4ApproveDispatch
                  isAllInfoView={false}
                  coolerPackage={coolerPackage}
                  isColdChainExcursion={isColdChainExcursion}
                  concordancePassed={concordancePassed}
                  isOrderDispatched={isOrderDispatched}
                  isFulfilling={isFulfilling}
                  onAuthorizeFulfillment={onAuthorizeFulfillment}
                  fhirMedDispense={fhirMedDispense}
                  pharmacistName={pharmacistName}
                  orderKey={orderKey}
                  nurseAlert={nurseAlert}
                  backendError={backendError}
                  onClearBackendError={onClearBackendError}
                  onAdvanceToStep5={() => handleAdvanceToStep(5)}
                  onBackToStep3={() => {
                    setActiveStep(3);
                    setStepNotice(null);
                  }}
                  expandedJson={expandedJson}
                  onToggleJson={toggleJson}
                />
              )}

              {activeStep === 5 && (
                <Step5HipaaCompliance
                  isAllInfoView={false}
                  hipaaReport={hipaaReport}
                  nurseAlert={nurseAlert}
                  fhirAuditEvent={fhirAuditEvent}
                  isOrderDispatched={isOrderDispatched}
                  activeWorkflow={activeWorkflow}
                  activeIndent={activeIndent}
                  pharmacistName={pharmacistName}
                  onBackToStep4={() => {
                    setActiveStep(4);
                    setStepNotice(null);
                  }}
                  onBackToStep1={() => {
                    setActiveStep(1);
                    setStepNotice(null);
                  }}
                  expandedJson={expandedJson}
                  onToggleJson={toggleJson}
                />
              )}

              {isOrderDispatched && (
                <DispensaryCertificationFooter pharmacistName={pharmacistName} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
