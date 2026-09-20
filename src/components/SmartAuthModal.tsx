import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, UserCheck, RefreshCw, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import {
  getAuthSession,
  simulateTokenRefresh,
  simulateTokenRevocation,
  subscribeToAuthChanges,
} from '../services/smartAuthService';
import { SmartAuthSession } from '../types/clinical';

interface SmartAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartAuthModal: React.FC<SmartAuthModalProps> = ({ isOpen, onClose }) => {
  const [session, setSession] = useState<SmartAuthSession>(getAuthSession);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return subscribeToAuthChanges((newSession) => {
      if (newSession) setSession(newSession);
    });
  }, []);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await simulateTokenRefresh();
      setSession(fresh);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRevoke = () => {
    simulateTokenRevocation();
    setSession(getAuthSession());
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(`Bearer ${session.accessToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      padding: '1rem',
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: session.isAuthenticated && !session.revoked ? 'var(--badge-green-bg)' : 'var(--badge-red-bg)',
              color: session.isAuthenticated && !session.revoked ? 'var(--badge-green-text)' : 'var(--badge-red-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                SMART on FHIR OAuth 2.0 PKCE Session
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                RFC 7636 Proof Key for Code Exchange (Zero Cleartext Credentials)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.35rem', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status Alert Banner */}
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            backgroundColor: session.isAuthenticated && !session.revoked ? 'var(--badge-green-bg)' : 'var(--badge-red-bg)',
            border: `1px solid ${session.isAuthenticated && !session.revoked ? 'var(--badge-green-border)' : 'var(--badge-red-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {session.isAuthenticated && !session.revoked ? (
                <CheckCircle2 size={18} style={{ color: 'var(--badge-green-text)' }} />
              ) : (
                <AlertTriangle size={18} style={{ color: 'var(--badge-red-text)' }} />
              )}
              <div style={{ fontSize: '0.85rem', color: session.isAuthenticated && !session.revoked ? 'var(--badge-green-text)' : 'var(--badge-red-text)', fontWeight: 600 }}>
                {session.isAuthenticated && !session.revoked
                  ? 'Active Authenticated Session: Scopes Valid for EHR Read & Write'
                  : 'Session Revoked / Expired: EHR FHIR Client Enforcing 401 Unauthorized Gate'}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              {session.isAuthenticated && !session.revoked ? 'Expires in 60m' : 'Status: Revoked'}
            </span>
          </div>

          {/* Section 1: Clinician Identity Context */}
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <UserCheck size={16} style={{ color: 'var(--clinical-blue)' }} />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Authenticated Practitioner Context
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Clinician:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{session.user.fullName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{session.user.role}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>FHIR Resource ID:</span>
                <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-surface)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                  {session.user.practitionerId}
                </code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>National Provider ID (NPI):</span>
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{session.user.npi}</div>
              </div>
            </div>
          </div>

          {/* Section 2: PKCE Cryptographic Handshake (RFC 7636) */}
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={16} style={{ color: 'var(--clinical-blue)' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  RFC 7636 PKCE S256 Cryptographic Proof
                </h3>
              </div>
              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                Handshake: {session.pkceHandshake.exchangeLatencyMs}ms
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Code Challenge Method:</span>{' '}
                <strong style={{ color: 'var(--clinical-blue)' }}>S256 (SHA-256 + Base64URL)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Code Challenge:</span>
                <code style={{ display: 'block', fontSize: '0.72rem', backgroundColor: 'var(--bg-surface)', padding: '0.35rem 0.5rem', borderRadius: '4px', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                  {session.pkceHandshake.codeChallenge || 'None (Session Revoked)'}
                </code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Code Verifier (Single-use high-entropy secret):</span>
                <code style={{ display: 'block', fontSize: '0.72rem', backgroundColor: 'var(--bg-surface)', padding: '0.35rem 0.5rem', borderRadius: '4px', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                  {session.pkceHandshake.codeVerifier ? `${session.pkceHandshake.codeVerifier.slice(0, 32)}...[protected]` : 'None (Session Revoked)'}
                </code>
              </div>
            </div>
          </div>

          {/* Section 3: Scopes & Bearer Token */}
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <Lock size={16} style={{ color: 'var(--clinical-blue)' }} />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Granted SMART Scopes & Bearer Token
              </h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {session.grantedScopes.map((sc) => (
                <span
                  key={sc}
                  className={`badge ${sc.includes('write') ? 'badge-amber' : sc.includes('read') ? 'badge-blue' : 'badge-neutral'}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {sc}
                </span>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HTTP Authorization Header:</span>
                <button
                  onClick={handleCopyToken}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  disabled={!session.isAuthenticated || session.revoked}
                >
                  {copied ? 'Copied!' : 'Copy Bearer Header'}
                </button>
              </div>
              <code style={{
                display: 'block',
                fontSize: '0.72rem',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                wordBreak: 'break-all',
                color: session.isAuthenticated && !session.revoked ? 'var(--text-primary)' : 'var(--badge-red-text)',
              }}>
                {session.isAuthenticated && !session.revoked
                  ? `Bearer ${session.accessToken.slice(0, 48)}...`
                  : '401 Unauthorized (No active Bearer header)'}
              </code>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', gap: '0.4rem' }}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>{session.revoked ? 'Restore / Re-authenticate' : 'Refresh Token (New PKCE)'}</span>
            </button>

            {session.isAuthenticated && !session.revoked && (
              <button
                onClick={handleRevoke}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', color: 'var(--error-red)', borderColor: 'var(--badge-red-border)' }}
                title="Test 401 Unauthorized gate in EHR FHIR client"
              >
                <span>Simulate Expired Token (Test 401)</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
