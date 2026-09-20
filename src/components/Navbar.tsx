import React from 'react';
import { Thermometer, LogOut, User, Building2, MapPin } from 'lucide-react';

interface NavbarProps {
  isColdChainActive: boolean;
  currentTemp: number;
  practitionerName?: string;
  currentRole?: string;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isColdChainActive,
  currentTemp,
  practitionerName = 'Dr. Marcus Vance, PharmD',
  currentRole = 'PHARMACIST',
  onSignOut,
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
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Left: Hospital Department & Ward Locator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Building2 size={16} style={{ color: '#0284c7' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.2px' }}>
            St. Jude Memorial Hospital
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>&middot;</span>
          <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
            Central Pharmacy
          </span>
        </div>

        <div
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Live Cold-Chain Telemetry Pill */}
        {isColdChainActive && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '4px',
              backgroundColor: isTempOptimal ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${isTempOptimal ? '#a7f3d0' : '#fecaca'}`,
              color: isTempOptimal ? '#065f46' : '#991b1b',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            <Thermometer size={14} style={{ color: isTempOptimal ? '#059669' : '#dc2626' }} />
            <span>
              Storage: <strong>{currentTemp.toFixed(1)}°C</strong> ({isTempOptimal ? '2–8°C ✓' : '⚠ Out of Range'})
            </span>
          </div>
        )}

        {/* Practitioner Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.85rem' }}>
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
            }}
          >
            <User size={14} />
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.1 }}>
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
              padding: '0.3rem 0.6rem',
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
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
