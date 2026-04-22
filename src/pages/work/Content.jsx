import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { format, parseISO } from 'date-fns';

const STATUSES = [
  { key: 'idea',      label: 'Idea' },
  { key: 'script',    label: 'Script' },
  { key: 'to_film',   label: 'To Film' },
  { key: 'filmed',    label: 'Filmed' },
  { key: 'editing',   label: 'Editing' },
  { key: 'approved',  label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'posted',    label: 'Posted' },
];

const PILLARS = [
  { key: 'proof',     label: 'Proof' },
  { key: 'education', label: 'Education' },
  { key: 'bts',       label: 'BTS' },
];

const CONTENT_TYPES = ['reel', 'post', 'story', 'carousel'];

export default function Content() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '', pillar: 'education', content_type: 'reel', body: '', hook: '', cta: '',
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api('/scripts');
      setItems(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function moveItem(item, direction) {
    const currentIdx = STATUSES.findIndex(s => s.key === item.status);
    const next = STATUSES[currentIdx + direction];
    if (!next) return;
    try {
      await api(`/scripts/${item.id}`, { method: 'PATCH', body: { status: next.key } });
      load();
    } catch (e) { setError(e.message); }
  }

  async function addItem(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/scripts', { method: 'POST', body: newItem });
      setShowAdd(false);
      setNewItem({ title: '', pillar: 'education', content_type: 'reel', body: '', hook: '', cta: '' });
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await api(`/scripts/${item.id}`, { method: 'DELETE' });
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function saveEdit() {
    try {
      const patch = {
        title: editing.title,
        body: editing.body,
        pillar: editing.pillar,
        status: editing.status,
        content_type: editing.content_type,
        scheduled_post_date: editing.scheduled_post_date,
        hook: editing.hook,
        cta: editing.cta,
        notes: editing.notes,
      };
      await api(`/scripts/${editing.id}`, { method: 'PATCH', body: patch });
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

  const grouped = STATUSES.reduce((acc, s) => { acc[s.key] = []; return acc; }, {});
  items.forEach(i => { if (grouped[i.status]) grouped[i.status].push(i); });

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Content</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {items.length} in flight · {grouped.posted.length} posted
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={primaryButton}>
          <Plus size={14} /> Add Idea
        </button>
      </header>

      {error && <ErrorBanner msg={error} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STATUSES.length}, minmax(220px, 1fr))`,
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '12px',
      }}>
        {STATUSES.map(status => (
          <div
            key={status.key}
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
                {status.label}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', padding: '1px 7px', borderRadius: '999px' }}>
                {grouped[status.key].length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[status.key].map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onPrev={() => moveItem(item, -1)}
                  onNext={() => moveItem(item, +1)}
                  canPrev={STATUSES.findIndex(s => s.key === item.status) > 0}
                  canNext={STATUSES.findIndex(s => s.key === item.status) < STATUSES.length - 1}
                  onClick={() => setEditing(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Content Idea">
        <form onSubmit={addItem}>
          <Field label="Title">
            <input
              required
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Pillar">
            <select value={newItem.pillar} onChange={(e) => setNewItem({ ...newItem, pillar: e.target.value })} style={inputStyle}>
              {PILLARS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={newItem.content_type} onChange={(e) => setNewItem({ ...newItem, content_type: e.target.value })} style={inputStyle}>
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Hook (opening line)">
            <input value={newItem.hook} onChange={(e) => setNewItem({ ...newItem, hook: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Script body">
            <textarea
              value={newItem.body}
              onChange={(e) => setNewItem({ ...newItem, body: e.target.value })}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
          <Field label="CTA">
            <input value={newItem.cta} onChange={(e) => setNewItem({ ...newItem, cta: e.target.value })} style={inputStyle} />
          </Field>
          <button type="submit" disabled={saving} style={{ ...primaryButton, width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.title || 'Edit'}>
        {editing && (
          <div>
            <Field label="Title">
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Status">
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} style={inputStyle}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Pillar">
                <select value={editing.pillar || ''} onChange={(e) => setEditing({ ...editing, pillar: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {PILLARS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Type">
                <select value={editing.content_type || ''} onChange={(e) => setEditing({ ...editing, content_type: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Scheduled post date">
                <input
                  type="date"
                  value={editing.scheduled_post_date || ''}
                  onChange={(e) => setEditing({ ...editing, scheduled_post_date: e.target.value || null })}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </Field>
            </div>
            <Field label="Hook">
              <input value={editing.hook || ''} onChange={(e) => setEditing({ ...editing, hook: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Script body">
              <textarea
                value={editing.body || ''}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={10}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>
            <Field label="CTA">
              <input value={editing.cta || ''} onChange={(e) => setEditing({ ...editing, cta: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Notes">
              <textarea
                value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={saveEdit} style={{ ...primaryButton, flex: 1, justifyContent: 'center' }}>
                Save
              </button>
              <button onClick={() => deleteItem(editing)} style={dangerButton}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ContentCard({ item, onPrev, onNext, canPrev, canNext, onClick }) {
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
      <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500 }}>
        {item.title}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {item.pillar && <span>{item.pillar}</span>}
        {item.content_type && <span>· {item.content_type}</span>}
      </div>
      {item.scheduled_post_date && (
        <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>
          {format(parseISO(item.scheduled_post_date), 'd MMM')}
        </div>
      )}
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
