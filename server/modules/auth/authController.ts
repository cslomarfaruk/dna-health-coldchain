import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';
import { JWT_SECRET, authenticateToken } from '../../middleware/auth';
import { phiSafeLog } from '../../middleware/phiLogger';

export const authRouter = Router();

// Login endpoint
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'Username and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        practitionerId: user.practitionerId,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    phiSafeLog('INFO', `User logged in: ${user.username} with role ${user.role}`);

    // Create AuditRecord for login
    await prisma.auditRecord.create({
      data: {
        eventType: 'USER_LOGIN',
        action: 'E',
        outcome: '0',
        outcomeDescription: `User ${user.username} (${user.role}) successfully authenticated`,
        userId: user.id,
        userRole: user.role,
        entityReference: `User/${user.id}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        practitionerId: user.practitionerId,
        email: user.email,
      },
    });
  } catch (err: any) {
    phiSafeLog('ERROR', 'Login error occurred', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to authenticate' });
  }
});

// Current user profile endpoint
authRouter.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        practitionerId: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});
