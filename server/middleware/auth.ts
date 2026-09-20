import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { phiSafeLog } from './phiLogger';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-coldchain-inpatient-jwt-token-2026';

export interface AuthUserPayload {
  id: string;
  username: string;
  fullName: string;
  role: 'NURSE' | 'PHARMACIST' | 'AUDITOR' | 'ADMIN';
  practitionerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required to access protected clinical resource.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    phiSafeLog('WARN', 'Invalid or expired JWT presented');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session token is invalid or expired. Please re-authenticate.',
    });
  }
}

export function requireRole(...allowedRoles: Array<'NURSE' | 'PHARMACIST' | 'AUDITOR' | 'ADMIN'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      phiSafeLog(
        'WARN',
        `RBAC Violation: User ${req.user.username} (${req.user.role}) attempted action requiring [${allowedRoles.join(', ')}]`
      );

      // Persist unauthorized access audit record
      try {
        await prisma.auditRecord.create({
          data: {
            eventType: 'UNAUTHORIZED_ACCESS',
            action: 'E',
            outcome: '8', // Serious failure
            outcomeDescription: `User ${req.user.username} with role ${req.user.role} attempted unauthorized access to ${req.originalUrl}. Required: ${allowedRoles.join(', ')}`,
            userId: req.user.id,
            userRole: req.user.role,
            entityReference: req.originalUrl,
            ipAddress: req.ip || '127.0.0.1',
          },
        });
      } catch (auditErr) {
        phiSafeLog('ERROR', 'Failed to log unauthorized access audit record', auditErr);
      }

      res.status(403).json({
        error: 'Forbidden',
        message: `Role "${req.user.role}" is not authorized for this operation. Permitted roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
