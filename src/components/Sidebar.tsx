import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Database,
  ShieldCheck,
  LogOut,
  Layers,
  Building2,
  Lock,
  Activity,
  X,
} from 'lucide-react';

export type NavigationTab = 'DISPENSARY' | 'INDENTS' | 'INTEROP' | 'AUDIT' | 'SURGERY';

interface SidebarProps {
  practitionerName: string;
  currentRole: string;
  onRoleChange: (role: string) => void;
  onSignOut: () => void;
  pendingIndentsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  practitionerName,
  currentRole,
  onRoleChange,
  onSignOut,
  pendingIndentsCount = 3,
  isOpen = false,
  onClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: {
    id: NavigationTab;
    path: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
    allowedRoles: string[];
  }[] = [
    {
      id: 'DISPENSARY',
      path: '/dispensary',
      label: 'Dispensary',
      description: 'Verify & dispatch medications',
      icon: <Layers size={17} />,
      badge: 'Active',
      allowedRoles: ['PHARMACIST', 'ADMIN'],
    },
    {
      id: 'INDENTS',
      path: '/indents',
      label: currentRole === 'NURSE' ? 'Nurse Requests' : 'Ward Requests',
      description: currentRole === 'NURSE' ? 'Bedside medication requisitions' : 'Ward requisitions (Read-only)',
      icon: <FileText size={17} />,
      badge: currentRole === 'NURSE' ? `${pendingIndentsCount} Orders` : 'Monitor',
      allowedRoles: ['NURSE', 'ADMIN'],
    },
    {
      id: 'INTEROP',
      path: '/orders',
      label: 'Orders',
      description: 'All medication orders',
      icon: <Database size={17} />,
      badge: 'Synced',
      allowedRoles: ['PHARMACIST', 'ADMIN'],
    },
    {
      id: 'AUDIT',
      path: '/audit',
      label: 'Audit Log',
      description: 'Activity & compliance log',
      icon: <ShieldCheck size={17} />,
      badge: 'Protected',
      allowedRoles: ['AUDITOR', 'ADMIN'],
    },
  ];

  return (
    <aside
      className={`sidebar-drawer ${isOpen ? 'open' : ''}`}
      style={{
        width: '250px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top Section: Brand & User Card */}
      <div>
        {/* Hospital Branding */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '7px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.2px', lineHeight: 1.2 }}>
                ST. JUDE HEALTH
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                Pharmacy · Cold Chain
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="mobile-only"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '4px',
              }}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Active Staff Persona Card */}
        <div
          style={{
            padding: '0.75rem 0.9rem',
            margin: '0.75rem 0.75rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '0.12rem 0.4rem',
                borderRadius: '3px',
                backgroundColor:
                  currentRole === 'PHARMACIST'
                    ? '#ecfdf5'
                    : currentRole === 'NURSE'
                    ? '#eff6ff'
                    : '#f5f3ff',
                color:
                  currentRole === 'PHARMACIST'
                    ? '#065f46'
                    : currentRole === 'NURSE'
                    ? '#1e40af'
                    : '#4338ca',
                border: `1px solid ${
                  currentRole === 'PHARMACIST'
                    ? '#a7f3d0'
                    : currentRole === 'NURSE'
                    ? '#bfdbfe'
                    : '#ddd6fe'
                }`,
              }}
            >
              {currentRole}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
              }}
              title="Verified Clinical Session"
            />
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {practitionerName}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
            Ward 4B
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav style={{ padding: '0.35rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '0.4rem 0.65rem 0.2rem 0.65rem', letterSpacing: '0.6px' }}>
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isRolePermitted = item.allowedRoles.includes(currentRole);

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (onClose) onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                  backgroundColor: isActive ? '#f0f9ff' : 'transparent',
                  color: isActive ? '#0284c7' : isRolePermitted ? '#475569' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  opacity: isRolePermitted ? 1 : 0.75,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = isRolePermitted ? '#475569' : '#94a3b8';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ color: isActive ? '#0284c7' : isRolePermitted ? '#64748b' : '#94a3b8' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, lineHeight: 1.2, color: isActive ? '#0369a1' : '#1e293b' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '0.1rem' }}>
                      {item.description}
                    </div>
                  </div>
                </div>

                {!isRolePermitted ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      backgroundColor: '#f1f5f9',
                      color: '#94a3b8',
                    }}
                    title="Restricted by Role"
                  >
                    <Lock size={10} />
                  </span>
                ) : item.badge ? (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '3px',
                      backgroundColor: isActive ? '#e0f2fe' : '#f1f5f9',
                      color: isActive ? '#0284c7' : '#64748b',
                      border: `1px solid ${isActive ? '#bae6fd' : '#e2e8f0'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Role Switcher & Sign Out */}
      <div style={{ padding: '0.85rem 0.85rem', borderTop: '1px solid #e2e8f0' }}>
        {/* Role Switcher */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              marginBottom: '0.3rem',
              letterSpacing: '0.5px',
            }}
          >
            Switch Role
          </label>
          <select
            value={currentRole}
            onChange={(e) => {
              onRoleChange(e.target.value);
              if (onClose) onClose();
            }}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              fontSize: '0.74rem',
              fontWeight: 600,
              borderRadius: '5px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            <option value="PHARMACIST">Pharmacist</option>
            <option value="NURSE">Nurse</option>
            <option value="AUDITOR">Auditor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Clinical Network Status Pill */}
        <div
          style={{
            padding: '0.45rem 0.65rem',
            backgroundColor: '#f8fafc',
            borderRadius: '5px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ color: '#64748b' }}>Network</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} /> Online
          </span>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => {
            onSignOut();
            if (onClose) onClose();
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.45rem',
            borderRadius: '5px',
            backgroundColor: '#ffffff',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
            e.currentTarget.style.color = '#b91c1c';
            e.currentTarget.style.borderColor = '#fca5a5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
