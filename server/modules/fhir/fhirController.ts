import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { fetchFhirMedicationRequest, FHIR_BASE_URL } from './fhirClient';

export const fhirRouter = Router();

// Retrieve FHIR MedicationRequest by ID
fhirRouter.get('/medication-requests/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const result = await fetchFhirMedicationRequest(req.params.id);
  if (!result.success) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

// FHIR server health/capability check
fhirRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const checkRes = await fetch(`${FHIR_BASE_URL}/metadata`, { signal: controller.signal });
    clearTimeout(timeout);

    res.json({
      fhirBaseUrl: FHIR_BASE_URL,
      isReachable: checkRes.ok,
      status: checkRes.status,
    });
  } catch (err: any) {
    res.status(503).json({
      fhirBaseUrl: FHIR_BASE_URL,
      isReachable: false,
      error: err.message,
    });
  }
});
