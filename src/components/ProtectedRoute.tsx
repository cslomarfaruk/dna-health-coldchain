import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Building2, User } from 'lucide-react';
import { AuthSession } from '../services/apiClient';

interface ProtectedRouteProps {
  session: AuthSession | null;
  allowedRoles: Array<'PHARMACIST' | 'NURSE' | 'AUDITOR' | 'ADMIN'>;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  session,
  allowedRoles,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // If not logged in, redirect to login page preserving target route
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if role is authorized
  const isAuthorized = allowedRoles.includes(session.user.role as any);

  if (!isAuthorized) {
    // Determine the staff member's default authorized home route
    const defaultRoute =
      session.user.role === 'NURSE'
        ? '/indents'
        : session.user.role === 'AUDITOR'
        ? '/audit'
        : '/dispensary';

    const defaultRoleLabel =
      session.user.role === 'NURSE'
        ? 'Inpatient Nurse Workstation (/indents)'
        : session.user.role === 'AUDITOR'
        ? 'Quality & Compliance Vault (/audit)'
        : 'Dispensary Pipeline (/dispensary)';

    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}>
        <div className="card" style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}>
            <ShieldAlert size={26} />
          </div>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Workstation Access Restricted
          </h2>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            fontSize: '0.75rem',
            color: '#475569',
            fontWeight: 600,
            marginBottom: '1rem',
          }}>
            <User size={13} />
            <span>Active Role: {session.user.role} ({session.user.fullName})</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            This clinical workstation requires <strong>{allowedRoles.join(' or ')}</strong> authorization. Under hospital safety protocols, staff access is strictly partitioned by role.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              onClick={() => navigate(defaultRoute)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.6rem', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={15} />
              <span>Go to {defaultRoleLabel}</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-outline"
              style={{ width: '100%', padding: '0.55rem', justifyContent: 'center', fontSize: '0.8rem' }}
            >
              Switch Staff Persona
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
