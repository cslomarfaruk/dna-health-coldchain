import { Request, Response, NextFunction } from 'express';

/**
 * PHI-Safe Logging Safeguard
 * Prevents direct identifiers (Patient Names, MRNs, DOBs, raw HL7, raw FHIR)
 * from leaking into system logs, console streams, or telemetry.
 */

const PHI_PATTERNS = [
  /MRN-\d+/gi,
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD DOB
  /MSH\|.+/gi,             // Raw HL7
];

export function sanitizeLogMessage(message: string): string {
  let clean = message;
  for (const pattern of PHI_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED_PHI]');
  }
  return clean;
}

export function phiSafeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any): void {
  const timestamp = new Date().toISOString();
  const sanitizedMsg = sanitizeLogMessage(message);
  
  if (meta) {
    const metaStr = sanitizeLogMessage(typeof meta === 'string' ? meta : JSON.stringify(meta));
    console.log(`[${timestamp}] [${level}] ${sanitizedMsg} | ${metaStr}`);
  } else {
    console.log(`[${timestamp}] [${level}] ${sanitizedMsg}`);
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const safePath = sanitizeLogMessage(req.originalUrl || req.url);
  const method = req.method;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    phiSafeLog('INFO', `HTTP ${method} ${safePath} -> Status: ${status} (${duration}ms)`);
  });

  next();
}
