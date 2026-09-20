import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger, phiSafeLog } from './middleware/phiLogger';
import { authRouter } from './modules/auth/authController';
import { smartOAuthRouter, getSmartConfiguration } from './modules/auth/smartOAuthController';
import { indentRouter } from './modules/indent/indentController';
import { fhirRouter } from './modules/fhir/fhirController';
import { rxnormRouter } from './modules/rxnorm/rxnormController';
import { hl7Router } from './modules/hl7/hl7Controller';
import { dispensingRouter } from './modules/dispensing/dispensingController';
import { auditRouter } from './modules/audit/auditService';
import { surgeryRouter } from './modules/surgery/surgeryController';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// SMART on FHIR Well-Known Configuration (RFC 5785 / HL7 SMART App Launch)
app.get('/.well-known/smart-configuration', getSmartConfiguration);
app.get('/api/.well-known/smart-configuration', getSmartConfiguration);

// SMART on FHIR OAuth 2.0 PKCE Endpoints (/oauth/authorize, /oauth/token)
app.use('/oauth', smartOAuthRouter);
app.use('/api/oauth', smartOAuthRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'DNA Health Healthcare Interoperability Server',
    timestamp: new Date().toISOString(),
  });
});

// Modular Healthcare Routers
app.use('/api/auth', authRouter);
app.use('/api/indents', indentRouter);
app.use('/api/fhir', fhirRouter);
app.use('/api/rxnorm', rxnormRouter);
app.use('/api/hl7', hl7Router);
app.use('/api/workflows', dispensingRouter);
app.use('/api/audit', auditRouter);
app.use('/api/surgery', surgeryRouter);

// Serve built frontend assets in production if dist directory exists
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/oauth') || req.path.startsWith('/.well-known')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler (Sanitizes error details before returning)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  phiSafeLog('ERROR', `Unhandled server error: ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    phiSafeLog('INFO', `Healthcare Interoperability Backend running on port ${PORT}`);
  });
}
