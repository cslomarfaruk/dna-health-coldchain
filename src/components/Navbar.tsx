import React from 'react';
import { Thermometer, LogOut, User, Building2, MapPin, Menu } from 'lucide-react';

interface NavbarProps {
  isColdChainActive: boolean;
  currentTemp: number;
  practitionerName?: string;
  currentRole?: string;
  onSignOut?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isColdChainActive,
  currentTemp,
  practitionerName = 'Dr. Marcus Vance, PharmD',
  currentRole = 'PHARMACIST',
  onSignOut,
  onToggleMobileMenu,
}) => {
  const isTempOptimal = currentTemp >= 2.0 && currentTemp <= 8.0;

  return (
    <header
      style={{
        height: '50px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0.85rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Left: Mobile Hamburger + Hospital Department & Ward Locator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="mobile-only"
            style={{
              background: 'none',
              border: 'none',
              color: '#0f172a',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            aria-label="Toggle navigation menu"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Building2 size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
            <span className="desktop-only" style={{ display: 'inline' }}>St. Jude Memorial Hospital</span>
            <span className="mobile-only" style={{ display: 'inline' }}>St. Jude</span>
          </span>
          <span className="desktop-only" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>&middot;</span>
          <span className="desktop-only" style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
            Central Pharmacy
          </span>
        </div>

        <div
          className="desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.15rem 0.5rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            fontSize: '0.72rem',
            color: '#475569',
          }}
        >
          <MapPin size={12} style={{ color: '#64748b' }} />
          <span>Ward 4B &middot; Bed 12</span>
        </div>
      </div>

      {/* Right: Cold-Chain Sensor Status & Practitioner Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        {/* Live Cold-Chain Telemetry Pill */}
        {isColdChainActive && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: isTempOptimal ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${isTempOptimal ? '#a7f3d0' : '#fecaca'}`,
              color: isTempOptimal ? '#065f46' : '#991b1b',
              fontSize: '0.74rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            title={`Cold-chain telemetry: ${currentTemp.toFixed(1)}°C (Nominal 2.0°C - 8.0°C)`}
          >
            <Thermometer size={14} style={{ color: isTempOptimal ? '#059669' : '#dc2626', flexShrink: 0 }} />
            <span>
              <span className="desktop-only" style={{ display: 'inline' }}>Storage: </span>
              <strong>{currentTemp.toFixed(1)}°C</strong>
              <span className="desktop-only" style={{ display: 'inline' }}>
                {' '}({isTempOptimal ? '2–8°C ✓' : '⚠ Out of Range'})
              </span>
            </span>
          </div>
        )}

        {/* Practitioner Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.55rem' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.72rem',
              flexShrink: 0,
            }}
            title={`${practitionerName} (${currentRole})`}
          >
            <User size={14} />
          </div>

          <div className="desktop-only">
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {practitionerName}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              {currentRole}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            title="Sign Out Session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.28rem 0.5rem',
              fontSize: '0.74rem',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.color = '#b91c1c';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <LogOut size={12} />
            <span className="desktop-only">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};

