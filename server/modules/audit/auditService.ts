import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { submitFhirAuditEvent, AuditEventPayload } from '../fhir/fhirClient';
import { phiSafeLog } from '../../middleware/phiLogger';

export const auditRouter = Router();

export interface RecordAuditParams {
  eventType: string;
  action: 'C' | 'R' | 'U' | 'D' | 'E';
  outcome: '0' | '4' | '8' | '12';
  outcomeDescription: string;
  userId?: string;
  userRole?: string;
  practitionerName?: string;
  entityReference?: string;
  ipAddress?: string;
}

/**
 * Persists an application AuditRecord in PostgreSQL AND posts an authentic FHIR R4 AuditEvent to the FHIR server.
 */
export async function logAuditEvent(params: RecordAuditParams): Promise<string> {
  let fhirAuditEventId: string | undefined;

  // 1. Send FHIR R4 AuditEvent to external FHIR server
  try {
    const fhirResult = await submitFhirAuditEvent({
      eventType: params.eventType,
      action: params.action,
      outcome: params.outcome,
      outcomeDesc: params.outcomeDescription,
      practitionerReference: params.userId ? `Practitioner/${params.userId}` : undefined,
      practitionerName: params.practitionerName || 'Healthcare Clinician',
      entityReference: params.entityReference,
    });

    if (fhirResult.success) {
      fhirAuditEventId = fhirResult.fhirAuditEventId;
    }
  } catch (err: any) {
    phiSafeLog('WARN', `External FHIR AuditEvent submission warning: ${err.message}`);
  }

  // 2. Persist in local database AuditRecord table
  const audit = await prisma.auditRecord.create({
    data: {
      fhirAuditEventId,
      eventType: params.eventType,
      action: params.action,
      outcome: params.outcome,
      outcomeDescription: params.outcomeDescription,
      userId: params.userId,
      userRole: params.userRole,
      entityReference: params.entityReference,
      ipAddress: params.ipAddress || '127.0.0.1',
    },
  });

  return audit.id;
}

// Auditor & Admin Endpoint: View audit trails
auditRouter.get(
  '/',
  authenticateToken,
  requireRole('AUDITOR', 'ADMIN', 'PHARMACIST'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventType, outcome, limit = '50' } = req.query;

      const records = await prisma.auditRecord.findMany({
        where: {
          ...(eventType ? { eventType: String(eventType) } : {}),
          ...(outcome ? { outcome: String(outcome) } : {}),
        },
        orderBy: { recordedAt: 'desc' },
        take: Math.min(parseInt(String(limit), 10) || 50, 100),
      });

      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
