import { executeSmartPkceAuth } from './smartAuthClient';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'NURSE' | 'PHARMACIST' | 'AUDITOR' | 'ADMIN';
    practitionerId?: string;
    email?: string;
  };
  patientContext?: string;
  authMethod?: 'SMART_ON_FHIR_PKCE' | 'SESSION_BEARER';
}

const SESSION_STORAGE_KEY = 'dna_health_session';

let currentSession: AuthSession | null = null;

export function getStoredSession(): AuthSession | null {
  if (currentSession) return currentSession;
  if (typeof window !== 'undefined') {
    try {
      const raw =
        window.sessionStorage?.getItem(SESSION_STORAGE_KEY) ||
        window.localStorage?.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token && parsed.user) {
          currentSession = parsed;
          return currentSession;
        }
      }
    } catch {}
  }
  return null;
}

export function setStoredSession(session: AuthSession | null): void {
  currentSession = session;
  if (typeof window !== 'undefined') {
    try {
      if (session) {
        const serialized = JSON.stringify(session);
        window.sessionStorage?.setItem(SESSION_STORAGE_KEY, serialized);
        window.localStorage?.setItem(SESSION_STORAGE_KEY, serialized);
      } else {
        window.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
        window.localStorage?.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {}
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // SMART on FHIR OAuth 2.0 PKCE Login (RFC 7636)
  async login(username: string, password: string): Promise<AuthSession> {
    try {
      // Execute PKCE S256 OAuth flow with launch context
      const smartToken = await executeSmartPkceAuth({ username, password });
      const session: AuthSession = {
        token: smartToken.access_token,
        user: smartToken.user,
        patientContext: smartToken.patient,
        authMethod: 'SMART_ON_FHIR_PKCE',
      };
      setStoredSession(session);
      return session;
    } catch {
      // Fallback to direct auth endpoint if SMART launch is bypassed
      const data = await request<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setStoredSession(data);
      return data;
    }
  },

  async getMe() {
    return request('/api/auth/me');
  },

  // Indents
  async getIndents(params?: Record<string, string>) {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/indents${qs}`);
  },

  async createIndent(indentData: any) {
    return request('/api/indents', {
      method: 'POST',
      body: JSON.stringify(indentData),
    });
  },

  async updateIndent(id: string, updates: any) {
    return request(`/api/indents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async cancelIndent(id: string) {
    return request(`/api/indents/${id}/cancel`, {
      method: 'POST',
    });
  },

  async deleteIndent(id: string) {
    return request(`/api/indents/${id}`, {
      method: 'DELETE',
    });
  },

  // FHIR
  async getFhirMedicationRequest(id: string) {
    return request(`/api/fhir/medication-requests/${id}`);
  },

  async getFhirHealth() {
    return request('/api/fhir/health');
  },

  // RxNorm
  async validateRxNorm(drugName: string, strength?: string) {
    return request('/api/rxnorm/validate', {
      method: 'POST',
      body: JSON.stringify({ drugName, strength }),
    });
  },

  // HL7
  async parseHl7(rawHl7: string) {
    return request('/api/hl7/parse', {
      method: 'POST',
      body: JSON.stringify({ rawHl7 }),
    });
  },

  // Workflows & 3-Way Reconciliation
  async initiateWorkflow(indentId: string, rawHl7: string, fhirMedicationRequestId: string) {
    return request('/api/workflows/initiate', {
      method: 'POST',
      body: JSON.stringify({ indentId, rawHl7, fhirMedicationRequestId }),
    });
  },

  async fulfillWorkflow(workflowId: string) {
    return request(`/api/workflows/${workflowId}/fulfill`, {
      method: 'POST',
    });
  },

  async recoverWorkflow(workflowId: string) {
    return request(`/api/workflows/${workflowId}/recover`, {
      method: 'POST',
    });
  },

  async getWorkflow(workflowId: string) {
    return request(`/api/workflows/${workflowId}`);
  },

  // Audit
  async getAuditRecords(limit = 50) {
    return request(`/api/audit?limit=${limit}`);
  },

  // Generic REST helpers
  async get(url: string) {
    const fullUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`;
    const data = await request(fullUrl);
    return { data };
  },

  async post(url: string, body?: any) {
    const fullUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`;
    const data = await request(fullUrl, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },

  // Surgical Time-Out API
  async getSurgicalCases() {
    return request('/api/surgery/cases');
  },

  async getSurgicalCase(caseId: string) {
    return request(`/api/surgery/cases/${caseId}`);
  },

  async completeSurgicalTimeout(caseId: string) {
    return request(`/api/surgery/cases/${caseId}/complete-timeout`, { method: 'POST' });
  },

  async getSurgicalComposition(caseId: string) {
    return request(`/api/surgery/cases/${caseId}/composition`);
  },
};
