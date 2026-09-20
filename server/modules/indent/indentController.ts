import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { phiSafeLog } from '../../middleware/phiLogger';

export const indentRouter = Router();

// Create a new Medication Indent (Submitted by Floor Nurse)
indentRouter.post(
  '/',
  authenticateToken,
  requireRole('NURSE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        patientMrn,
        patientName,
        requestedDrugName,
        requestedDose,
        requestedUnits,
        formulation,
        route,
        priority = 'ROUTINE',
        coldChainRequired = true,
        ward,
        bed,
      } = req.body;

      if (!patientMrn || !requestedDrugName || !requestedDose || !requestedUnits || !ward) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: patientMrn, requestedDrugName, requestedDose, requestedUnits, and ward are mandatory.',
        });
        return;
      }

      // Check for rapid duplicate submission to prevent accidental double-dosing
      const existingDuplicate = await prisma.medicationIndent.findFirst({
        where: {
          patientMrn: patientMrn.trim(),
          requestedDrugName: requestedDrugName.trim(),
          status: 'PENDING',
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000), // submitted within last 60 seconds
          },
        },
      });

      if (existingDuplicate) {
        res.status(409).json({
          error: 'DUPLICATE_INDENT',
          message: `Duplicate submission blocked: An active pending request #${existingDuplicate.indentNumber} for patient MRN ${patientMrn.trim()} and medication ${requestedDrugName.trim()} was just submitted. Each request must be unique to prevent accidental double-dispensing.`,
        });
        return;
      }

      const count = await prisma.medicationIndent.count();
      const indentNumber = `IND-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const indent = await prisma.medicationIndent.create({
        data: {
          indentNumber,
          patientMrn: patientMrn.trim(),
          patientName: (patientName || 'Anonymous Synthetic Patient').trim(),
          requestedDrugName: requestedDrugName.trim(),
          requestedDose: String(requestedDose).trim(),
          requestedUnits: requestedUnits.trim(),
          formulation: formulation ? formulation.trim() : null,
          route: route ? route.trim() : 'Subcutaneous',
          priority: ['ROUTINE', 'URGENT', 'STAT'].includes(priority) ? priority : 'ROUTINE',
          coldChainRequired: Boolean(coldChainRequired),
          ward: ward.trim(),
          bed: bed ? bed.trim() : null,
          status: 'PENDING',
          nurseId: req.user!.id,
        },
      });

      phiSafeLog('INFO', `Nurse ${req.user!.username} created MedicationIndent ${indent.indentNumber}`);

      // Audit indent creation
      await prisma.auditRecord.create({
        data: {
          eventType: 'INDENT_CREATED',
          action: 'C',
          outcome: '0',
          outcomeDescription: `Floor Nurse created medication indent ${indent.indentNumber} for cold-chain drug`,
          userId: req.user!.id,
          userRole: req.user!.role,
          entityReference: `MedicationIndent/${indent.id}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      res.status(201).json(indent);
    } catch (err: any) {
      phiSafeLog('ERROR', `Failed to create indent: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// List indents with optional query filters
indentRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { indentNumber, drug, dose, mrn } = req.query;
    const where: any = {};

    if (indentNumber) {
      where.indentNumber = String(indentNumber).trim();
    }
    if (mrn) {
      where.patientMrn = { contains: String(mrn).trim(), mode: 'insensitive' };
    }
    if (drug) {
      where.requestedDrugName = { contains: String(drug).trim(), mode: 'insensitive' };
    }
    if (dose) {
      where.requestedDose = String(dose).trim();
    }

    const indents = await prisma.medicationIndent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        nurse: {
          select: { fullName: true, username: true },
        },
        workflows: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: indentNumber ? 1 : 100,
    });

    res.json(indents);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Get single indent
indentRouter.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const indent = await prisma.medicationIndent.findUnique({
      where: { id: req.params.id },
      include: {
        nurse: {
          select: { fullName: true, username: true },
        },
        reconciliationResults: true,
      },
    });

    if (!indent) {
      res.status(404).json({ error: 'Not Found', message: 'Medication indent not found' });
      return;
    }

    res.json(indent);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Update / Edit an Indent (Allowed for NURSE or ADMIN when PENDING)
indentRouter.put(
  '/:id',
  authenticateToken,
  requireRole('NURSE', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const indent = await prisma.medicationIndent.findUnique({
        where: { id: req.params.id },
      });

      if (!indent) {
        res.status(404).json({ error: 'Not Found', message: 'Medication indent not found' });
        return;
      }

      if (indent.status === 'DISPATCHED' || indent.status === 'FULFILLED') {
        res.status(400).json({
          error: 'Bad Request',
          message: `Cannot edit indent in "${indent.status}" status. The medication has already been processed by Central Pharmacy.`,
        });
        return;
      }

      const {
        patientMrn,
        patientName,
        requestedDrugName,
        requestedDose,
        requestedUnits,
        route,
        priority,
        ward,
        bed,
      } = req.body;

      const updated = await prisma.medicationIndent.update({
        where: { id: req.params.id },
        data: {
          ...(patientMrn && { patientMrn: patientMrn.trim() }),
          ...(patientName && { patientName: patientName.trim() }),
          ...(requestedDrugName && { requestedDrugName: requestedDrugName.trim() }),
          ...(requestedDose && { requestedDose: String(requestedDose).trim() }),
          ...(requestedUnits && { requestedUnits: requestedUnits.trim() }),
          ...(route && { route: route.trim() }),
          ...(priority && { priority: ['ROUTINE', 'URGENT', 'STAT'].includes(priority) ? priority : 'ROUTINE' }),
          ...(ward && { ward: ward.trim() }),
          ...(bed !== undefined && { bed: bed ? bed.trim() : null }),
        },
      });

      phiSafeLog('INFO', `User ${req.user!.username} updated MedicationIndent ${updated.indentNumber}`);

      await prisma.auditRecord.create({
        data: {
          eventType: 'INDENT_MODIFIED',
          action: 'U',
          outcome: '0',
          outcomeDescription: `Floor Nurse modified medication indent ${updated.indentNumber}`,
          userId: req.user!.id,
          userRole: req.user!.role,
          entityReference: `MedicationIndent/${updated.id}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      res.json(updated);
    } catch (err: any) {
      phiSafeLog('ERROR', `Failed to update indent: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// Cancel an Indent (Allowed for NURSE or ADMIN)
indentRouter.post(
  '/:id/cancel',
  authenticateToken,
  requireRole('NURSE', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const indent = await prisma.medicationIndent.findUnique({
        where: { id: req.params.id },
      });

      if (!indent) {
        res.status(404).json({ error: 'Not Found', message: 'Medication indent not found' });
        return;
      }

      if (indent.status === 'DISPATCHED' || indent.status === 'FULFILLED') {
        res.status(400).json({
          error: 'Bad Request',
          message: `Cannot cancel indent in "${indent.status}" status. Courier is already en route or fulfilled.`,
        });
        return;
      }

      const updated = await prisma.medicationIndent.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });

      phiSafeLog('INFO', `User ${req.user!.username} cancelled MedicationIndent ${updated.indentNumber}`);

      await prisma.auditRecord.create({
        data: {
          eventType: 'INDENT_CANCELLED',
          action: 'U',
          outcome: '0',
          outcomeDescription: `Floor Nurse cancelled medication indent ${updated.indentNumber}`,
          userId: req.user!.id,
          userRole: req.user!.role,
          entityReference: `MedicationIndent/${updated.id}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      res.json(updated);
    } catch (err: any) {
      phiSafeLog('ERROR', `Failed to cancel indent: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// Delete an Indent (Allowed for NURSE or ADMIN when PENDING or CANCELLED)
indentRouter.delete(
  '/:id',
  authenticateToken,
  requireRole('NURSE', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const indent = await prisma.medicationIndent.findUnique({
        where: { id: req.params.id },
        include: { workflows: true },
      });

      if (!indent) {
        res.status(404).json({ error: 'Not Found', message: 'Medication indent not found' });
        return;
      }

      if (indent.workflows && indent.workflows.length > 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot permanently delete an indent linked to active dispensary workflows. Please cancel it instead.',
        });
        return;
      }

      // Delete any associated reconciliation results first
      await prisma.reconciliationResult.deleteMany({
        where: { indentId: req.params.id },
      });

      // Delete the indent record
      await prisma.medicationIndent.delete({
        where: { id: req.params.id },
      });

      phiSafeLog('INFO', `User ${req.user!.username} deleted MedicationIndent ${indent.indentNumber}`);

      await prisma.auditRecord.create({
        data: {
          eventType: 'INDENT_DELETED',
          action: 'D',
          outcome: '0',
          outcomeDescription: `Floor Nurse deleted medication indent ${indent.indentNumber}`,
          userId: req.user!.id,
          userRole: req.user!.role,
          entityReference: `MedicationIndent/${indent.id}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      res.json({ success: true, message: `Indent ${indent.indentNumber} successfully deleted` });
    } catch (err: any) {
      phiSafeLog('ERROR', `Failed to delete indent: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
