import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { LogOut, Plus, Users, Loader2, ExternalLink, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({
    business_name: '',
    contact_email: '',
    service_start_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const data = await api('/clients');
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/clients', { method: 'POST', body: newClient });
      setShowAddModal(false);
      setNewClient({ business_name: '', contact_email: '', service_start_date: '' });
      fetchClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)', fontWeight: 600 }}>
            Liam Hunt — Fitness Marketing
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Agency Dashboard
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/work/today')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <LayoutDashboard size={14} />
            My Work
          </button>
          <button
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
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
      </header>

      {/* Main */}
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: 'var(--color-accent)' }} />
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>
              Clients
            </h2>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {clients.length}
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Plus size={14} />
            Add Client
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Loader2 size={24} className="spin" />
          </div>
        ) : clients.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
          >
            No clients yet. Click "Add Client" to get started.
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                gap: '12px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <span>Business</span>
              <span>Start Date</span>
              <span>Ad Spend</span>
              <span>Enquiries</span>
              <span>Status</span>
              <span>Meta</span>
            </div>
            {/* Rows */}
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate(`/client/${client.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  transition: 'background-color 0.15s',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <span style={{ fontWeight: 500 }}>{client.business_name}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDate(client.service_start_date)}
                </span>
                <span>
                  {client.current_ad_spend != null
                    ? `£${Number(client.current_ad_spend).toLocaleString()}`
                    : '—'}
                </span>
                <span>{client.enquiries_this_month ?? '—'}</span>
                <span>
                  <StatusBadge
                    status={client.status || 'grey'}
                    label={client.status || 'N/A'}
                  />
                </span>
                <span>
                  {client.meta_connected ? (
                    <StatusBadge status="green" label="Connected" />
                  ) : (
                    <StatusBadge status="grey" label="Not connected" />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Client Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Client"
      >
        <form onSubmit={handleAddClient}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              value={newClient.business_name}
              onChange={(e) =>
                setNewClient({ ...newClient, business_name: e.target.value })
              }
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Contact Email</label>
            <input
              type="email"
              value={newClient.contact_email}
              onChange={(e) =>
                setNewClient({ ...newClient, contact_email: e.target.value })
              }
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Service Start Date</label>
            <input
              type="date"
              value={newClient.service_start_date}
              onChange={(e) =>
                setNewClient({ ...newClient, service_start_date: e.target.value })
              }
              required
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
