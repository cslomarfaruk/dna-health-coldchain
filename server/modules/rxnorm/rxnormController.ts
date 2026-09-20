import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { validateMedicationWithRxNav, validateMedicationByRxCui, LOINC_CODES } from './rxnormService';

export const rxnormRouter = Router();

// Validate by drug name or RxCUI code
rxnormRouter.post('/validate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { drugName, rxcui, strength } = req.body;

  const target = rxcui || drugName;
  if (!target) {
    res.status(400).json({ error: 'Bad Request', message: 'drugName or rxcui is required' });
    return;
  }

  const result = await validateMedicationWithRxNav(target, strength || '');
  res.json(result);
});

// Standard LOINC Clinical Parameters Endpoint
rxnormRouter.get('/loinc-codes', authenticateToken, (_req: Request, res: Response): void => {
  res.json({
    standardSystem: 'http://loinc.org',
    codes: LOINC_CODES,
  });
});

// Direct RxNorm RxCUI Lookup Endpoint
rxnormRouter.get('/rxcui/:rxcui', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { rxcui } = req.params;
  const { strength } = req.query;

  const result = await validateMedicationByRxCui(rxcui, String(strength || ''));
  res.json(result);
});
