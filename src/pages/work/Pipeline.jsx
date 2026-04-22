import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { format, parseISO } from 'date-fns';

const STAGES = [
  { key: 'lead',        label: 'New' },
  { key: 'qualified',   label: 'Qualified' },
  { key: 'vsl_sent',    label: 'VSL Sent' },
  { key: 'call_booked', label: 'Call Booked' },
  { key: 'call_done',   label: 'Call Done' },
  { key: 'proposal',    label: 'Proposal' },
  { key: 'signed',      label: 'Signed' },
  { key: 'lost',        label: 'Lost' },
];

const SOURCES = ['manychat', 'dm', 'outreach', 'referral', 'ad'];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ handle: '', name: '', business_name: '', source: 'manychat', dm_snippet: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api('/work/leads');
      setLeads(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function moveLead(lead, direction) {
    const currentIdx = STAGES.findIndex(s => s.key === lead.stage);
    const next = STAGES[currentIdx + direction];
    if (!next) return;
    try {
      await api(`/work/leads/${lead.id}`, { method: 'PATCH', body: { stage: next.key } });
      load();
    } catch (e) { setError(e.message); }
  }

  async function addLead(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/work/leads', { method: 'POST', body: newLead });
      setShowAdd(false);
      setNewLead({ handle: '', name: '', business_name: '', source: 'manychat', dm_snippet: '' });
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteLead(lead) {
    if (!confirm(`Delete "${lead.handle || lead.name}"?`)) return;
    try {
      await api(`/work/leads/${lead.id}`, { method: 'DELETE' });
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function saveEdit() {
    try {
      const { id, ...patch } = editing;
      await api(`/work/leads/${id}`, { method: 'PATCH', body: patch });
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: 'var(--color-text-secondary)' }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  const grouped = STAGES.reduce((acc, s) => { acc[s.key] = []; return acc; }, {});
  leads.forEach(l => { if (grouped[l.stage]) grouped[l.stage].push(l); });

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Pipeline</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {leads.length} leads · {grouped.signed.length} signed · {grouped.lost.length} lost
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={primaryButton}>
          <Plus size={14} /> Add Lead
        </button>
      </header>

      {error && <ErrorBanner msg={error} />}

      {/* Kanban */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`,
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '12px',
      }}>
        {STAGES.map(stage => (
          <div
            key={stage.key}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '12px',
              minHeight: '300px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stage.label}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', padding: '1px 7px', borderRadius: '999px' }}>
                {grouped[stage.key].length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[stage.key].map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onPrev={() => moveLead(lead, -1)}
                  onNext={() => moveLead(lead, +1)}
                  canPrev={STAGES.findIndex(s => s.key === lead.stage) > 0}
                  canNext={STAGES.findIndex(s => s.key === lead.stage) < STAGES.length - 1}
                  onClick={() => setEditing(lead)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Lead">
        <form onSubmit={addLead}>
          <Field label="IG handle">
            <input
              value={newLead.handle}
              onChange={(e) => setNewLead({ ...newLead, handle: e.target.value })}
              placeholder="@example"
              style={inputStyle}
            />
          </Field>
          <Field label="Name">
            <input
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Business name">
            <input
              value={newLead.business_name}
              onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Source">
            <select
              value={newLead.source}
              onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              style={inputStyle}
            >
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="DM snippet / context">
            <textarea
              value={newLead.dm_snippet}
              onChange={(e) => setNewLead({ ...newLead, dm_snippet: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
          <button type="submit" disabled={saving} style={{ ...primaryButton, width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Lead">
        {editing && (
          <div>
            <Field label="IG handle">
              <input value={editing.handle || ''} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Name">
              <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Business name">
              <input value={editing.business_name || ''} onChange={(e) => setEditing({ ...editing, business_name: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Stage">
              <select value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value })} style={inputStyle}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={editing.source || ''} onChange={(e) => setEditing({ ...editing, source: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
            {editing.stage === 'lost' && (
              <Field label="Lost reason">
                <input value={editing.lost_reason || ''} onChange={(e) => setEditing({ ...editing, lost_reason: e.target.value })} style={inputStyle} />
              </Field>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={saveEdit} style={{ ...primaryButton, flex: 1, justifyContent: 'center' }}>
                Save
              </button>
              <button onClick={() => deleteLead(editing)} style={dangerButton}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LeadCard({ lead, onPrev, onNext, canPrev, canNext, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '10px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {lead.handle || lead.name || 'Untitled'}
      </div>
      {(lead.name && lead.handle) && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          {lead.name}
        </div>
      )}
      {lead.business_name && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          {lead.business_name}
        </div>
      )}
      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
        {lead.source || '—'} · {format(parseISO(lead.created_at), 'd MMM')}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        <IconButton disabled={!canPrev} onClick={(e) => { e.stopPropagation(); onPrev(); }}>
          <ChevronLeft size={13} />
        </IconButton>
        <IconButton disabled={!canNext} onClick={(e) => { e.stopPropagation(); onNext(); }}>
          <ChevronRight size={13} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '3px',
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-border)' : 'var(--color-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '8px',
      color: 'var(--color-danger)',
      fontSize: '14px',
      marginBottom: '16px',
    }}>
      {msg}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 14px',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const dangerButton = {
  padding: '9px 12px',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-danger)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
