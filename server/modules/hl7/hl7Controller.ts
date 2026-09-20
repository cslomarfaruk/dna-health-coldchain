import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { parseAndValidateOmp09 } from './hl7Service';

export const hl7Router = Router();

hl7Router.post('/parse', authenticateToken, (req: Request, res: Response): void => {
  const { rawHl7 } = req.body;

  if (!rawHl7) {
    res.status(400).json({ error: 'Bad Request', message: 'rawHl7 is required' });
    return;
  }

  try {
    const parsed = parseAndValidateOmp09(rawHl7);
    res.json(parsed);
  } catch (err: any) {
    res.status(400).json({ error: 'HL7_PARSER_ERROR', message: err.message });
  }
});
