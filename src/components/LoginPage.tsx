import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  Key,
  ArrowRight,
  Building2,
  Stethoscope,
  Pill,
  ClipboardCheck,
  Settings,
  Check
} from 'lucide-react';
import { api, AuthSession } from '../services/apiClient';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

const PRESET_PERSONAS: {
  role: 'NURSE' | 'PHARMACIST' | 'AUDITOR' | 'ADMIN';
  title: string;
  name: string;
  department: string;
  username: string;
  password: string;
  badgeClass: string;
  icon: React.ReactNode;
  defaultPath: string;
}[] = [
  {
    role: 'NURSE',
    title: 'Nurse',
    name: 'Elizabeth Warren, RN',
    department: 'Ward 4B Inpatient Desk',
    username: 'nurse_elizabeth',
    password: 'NursePass123!',
    badgeClass: 'badge-blue',
    icon: <Stethoscope size={20} style={{ color: '#0284c7' }} />,
    defaultPath: '/indents',
  },
  {
    role: 'PHARMACIST',
    title: 'Pharmacist',
    name: 'Dr. Marcus Vance, PharmD',
    department: 'Central Inpatient Dispensary',
    username: 'pharm_vance',
    password: 'PharmPass123!',
    badgeClass: 'badge-green',
    icon: <Pill size={20} style={{ color: '#059669' }} />,
    defaultPath: '/dispensary',
  },
  {
    role: 'AUDITOR',
    title: 'Auditor',
    name: 'Arthur Chen, CISA',
    department: 'Clinical Governance & Audit',
    username: 'auditor_chen',
    password: 'AuditPass123!',
    badgeClass: 'badge-neutral',
    icon: <ClipboardCheck size={20} style={{ color: '#4f46e5' }} />,
    defaultPath: '/audit',
  },
  {
    role: 'ADMIN',
    title: 'System Admin',
    name: 'System Administrator',
    department: 'Pharmacy Systems Administration',
    username: 'admin_sys',
    password: 'AdminPass123!',
    badgeClass: 'badge-amber',
    icon: <Settings size={20} style={{ color: '#d97706' }} />,
    defaultPath: '/dispensary',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectFrom = (location.state as any)?.from?.pathname;
  const [username, setUsername] = useState('pharm_vance');
  const [password, setPassword] = useState('PharmPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string, targetPath?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const userToLogin = customUser || username;
    const passToLogin = customPass || password;

    try {
      const session = await api.login(userToLogin, passToLogin);
      onLoginSuccess(session);

      // Automated redirect to role's designated workstation route or preserved from route
      const destination =
        targetPath ||
        (redirectFrom && redirectFrom !== '/login' ? redirectFrom : null) ||
        (session.user.role === 'NURSE'
          ? '/indents'
          : session.user.role === 'AUDITOR'
          ? '/audit'
          : '/dispensary');

      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (persona: typeof PRESET_PERSONAS[0]) => {
    setUsername(persona.username);
    setPassword(persona.password);
    handleLogin(undefined, persona.username, persona.password, persona.defaultPath);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ maxWidth: '840px', width: '100%' }}>
        {/* Clean Hospital Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '0.2px' }}>
                St. Jude Memorial Hospital
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, marginTop: '0.15rem' }}>
                Pharmacy Cold-Chain System
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, backgroundColor: '#ecfdf5', padding: '0.3rem 0.65rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            <span>System Online</span>
          </div>
        </div>

        {/* Main Split Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}>
          {/* Left: Credential Sign In Form */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1.15rem' }}>
                <Lock size={16} style={{ color: '#0284c7' }} />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  Staff Sign In
                </h2>
              </div>

              {errorMessage && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  padding: '0.5rem 0.75rem',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.85rem',
                }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={(e) => handleLogin(e)}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem 0.5rem 1.9rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                      }}
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.15rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem 0.5rem 1.9rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                      }}
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.55rem', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={13} style={{ color: '#16a34a' }} />
              <span>Access controlled by role</span>
            </div>
          </div>

          {/* Right: One-Click Clinical Staff Persona Cards */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Login
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Choose a staff profile to sign in
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {PRESET_PERSONAS.map((p) => (
                <div
                  key={p.role}
                  onClick={() => handleSelectPersona(p)}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {p.icon}
                      </div>
                      <span className={`badge ${p.badgeClass}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                        {p.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {p.department}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.6rem', fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
                    <span>Sign In</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.55rem 0.75rem',
              backgroundColor: '#f8fafc',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#64748b',
            }}>
              <span>Demo accounts &middot; Access based on role</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 600 }}>
                <Check size={12} />
                <span>System Ready</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
