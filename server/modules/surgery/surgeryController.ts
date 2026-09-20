import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  SCHEDULED_SURGICAL_CASES,
  evaluateSurgicalCase,
  compileFhirSurgicalComposition,
  submitSurgicalCompositionToFhir,
} from './surgeryService';
import { phiSafeLog } from '../../middleware/phiLogger';

export const surgeryRouter = Router();

/**
 * GET /api/surgery/cases
 * Returns all scheduled surgical cases with pre-op summary status
 */
surgeryRouter.get('/cases', authenticateToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const cases = Object.values(SCHEDULED_SURGICAL_CASES).map((c) => ({
      caseId: c.caseId,
      procedureName: c.procedure.procedureName,
      patientName: c.procedure.patientName,
      patientMrn: c.procedure.patientMrn,
      operatingRoom: c.procedure.operatingRoom,
      scheduledTime: c.procedure.scheduledTime,
      leadSurgeon: c.procedure.leadSurgeon.name,
      overallReadiness: c.overallReadiness,
      activeHoldsCount: c.activeSafetyHolds.length,
      consentStatus: c.consent.consentStatus,
      allergyStatus: c.allergies.safetyStatus,
      coagulationStatus: c.coagulation.overallStatus,
    }));

    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve surgical cases', message: err.message });
  }
});

/**
 * GET /api/surgery/cases/:id
 * Retrieves full pre-incision Time-Out evaluation for a case
 */
surgeryRouter.get('/cases/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const evaluation = evaluateSurgicalCase(req.params.id);
    res.json(evaluation);
  } catch (err: any) {
    if (err.message.includes('SURGICAL_CASE_NOT_FOUND')) {
      res.status(404).json({ error: 'Case Not Found', message: err.message });
      return;
    }
    res.status(500).json({ error: 'Evaluation Error', message: err.message });
  }
});

/**
 * POST /api/surgery/cases/:id/verify-timeout
 * Runs real-time safety gate evaluations across Consent, Allergies, and LOINC Clotting
 */
surgeryRouter.post('/cases/:id/verify-timeout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const evaluation = evaluateSurgicalCase(req.params.id);
    phiSafeLog('INFO', `Surgical Time-Out evaluated for ${evaluation.procedure.procedureName}: ${evaluation.overallReadiness}`);
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: 'Verification Error', message: err.message });
  }
});

/**
 * POST /api/surgery/cases/:id/complete-timeout
 * Attests Time-Out, compiles FHIR Composition, and records live HAPI FHIR resources
 */
surgeryRouter.post('/cases/:id/complete-timeout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const evaluation = evaluateSurgicalCase(req.params.id);

    // Enforce Hard Clinical Safety Gate
    if (evaluation.overallReadiness !== 'CLEARED_FOR_INCISION') {
      res.status(400).json({
        error: 'SURGICAL_HOLD_ACTIVE',
        message: `Cannot complete Time-Out: Surgical hold is actively engaged (${evaluation.activeSafetyHolds.join('; ')}). Incision is strictly prohibited.`,
        activeSafetyHolds: evaluation.activeSafetyHolds,
      });
      return;
    }

    // Submit authentic FHIR R4 Composition to HAPI FHIR server
    const fhirResult = await submitSurgicalCompositionToFhir(evaluation);

    res.json({
      success: true,
      message: 'Surgical Time-Out Attestation Completed. Official Surgical Record Compiled.',
      compositionId: fhirResult.compositionId || `comp-${Date.now()}`,
      fhirSyncStatus: fhirResult.success ? 'SYNCED_TO_HAPI_FHIR' : 'LOCAL_ONLY',
      evaluation,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Completion Error', message: err.message });
  }
});

/**
 * GET /api/surgery/cases/:id/composition
 * Returns the raw compiled FHIR R4 Composition resource
 */
surgeryRouter.get('/cases/:id/composition', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const evaluation = evaluateSurgicalCase(req.params.id);
    const composition = compileFhirSurgicalComposition(evaluation);
    res.json(composition);
  } catch (err: any) {
    res.status(500).json({ error: 'Composition Error', message: err.message });
  }
});
