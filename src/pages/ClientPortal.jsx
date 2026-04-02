import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  ClipboardList,
  StickyNote,
  LogOut,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const tabs = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'content', label: 'Content', icon: FileText },
  { key: 'live-stats', label: 'Live Stats', icon: BarChart3 },
  { key: 'reports', label: 'Monthly Reports', icon: ClipboardList },
  { key: 'notes', label: 'Agency Notes', icon: StickyNote, agencyOnly: true },
];

export default function ClientPortal() {
  const { id } = useParams();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAgency = profile?.role === 'agency';

  useEffect(() => {
    async function fetch() {
      try {
        const data = await api(`/clients/${id}`);
        setClient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  // Determine active tab from URL
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[3] || 'overview';

  function handleTabClick(tabKey) {
    navigate(`/client/${id}/${tabKey}`);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Loader2 size={28} className="spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-danger)',
          fontSize: '14px',
        }}
      >
        {error}
      </div>
    );
  }

  const visibleTabs = tabs.filter((t) => !t.agencyOnly || isAgency);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
          {isAgency && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: '0 0 12px',
                fontSize: '13px',
              }}
            >
              <ArrowLeft size={14} />
              Back to Dashboard
            </button>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              color: 'var(--color-text)',
              fontWeight: 600,
            }}
          >
            {client?.business_name || 'Client'}
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}
          >
            Client Portal
          </p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px', flex: 1 }}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: isActive
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background-color 0.15s, color 0.15s',
                  marginBottom: '2px',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <Outlet context={{ client, isAgency, clientId: id, refetchClient: () => {
          api(`/clients/${id}`).then(setClient).catch(console.error);
        }}} />
      </main>
    </div>
  );
}
