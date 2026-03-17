import React from 'react';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';

interface IdleWarningModalProps {
  show: boolean;
  remainingTime: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

function IdleWarningModal({
  show,
  remainingTime,
  onStayLoggedIn,
  onLogout,
}: IdleWarningModalProps): React.JSX.Element {
  if (!show) return <></>;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 'full',
              padding: '16px',
            }}
          >
            <AlertTriangle size={32} color="#D97706" />
          </div>
        </div>

        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '12px',
          }}
        >
          Session Expiring Soon
        </h2>

        <p
          style={{
            color: '#6B7280',
            marginBottom: '24px',
            lineHeight: '1.5',
          }}
        >
          You will be automatically logged out due to inactivity. Would you like to stay logged in?
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#D97706',
            fontWeight: '500',
          }}
        >
          <Clock size={18} />
          <span>Logging out in {remainingTime} seconds</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            <LogOut size={16} />
            Logout Now
          </button>
          <button
            onClick={onStayLoggedIn}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

export default IdleWarningModal;
