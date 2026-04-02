import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { Plus, Check, MessageSquare, Calendar, Film, Image, Layers } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, parseISO } from 'date-fns';

const STATUS_COLORS = {
  draft: { bg: '#3a3a3a', text: '#aaa' },
  pending_approval: { bg: '#78350f', text: '#fbbf24' },
  approved: { bg: '#064e3b', text: '#34d399' },
  published: { bg: '#1e3a5f', text: '#60a5fa' },
  revision_requested: { bg: '#7f1d1d', text: '#f87171' },
};

const TYPE_COLORS = {
  reel: '#a78bfa',
  post: '#60a5fa',
  story: '#34d399',
  carousel: '#fb923c',
};

const TYPE_ICONS = {
  reel: Film,
  post: Image,
  story: Layers,
  carousel: Layers,
};

const CONTENT_TYPES = ['reel', 'post', 'story', 'carousel'];
const ALL_STATUSES = ['draft', 'pending_approval', 'approved', 'published'];

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
  fontFamily: 'inherit',
  resize: 'vertical',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '32px',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || '#888';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: `${color}22`,
        color: color,
        textTransform: 'capitalize',
      }}
    >
      {type}
    </span>
  );
}

function ContentTypeIcon({ type, size = 28 }) {
  const Icon = TYPE_ICONS[type] || Image;
  const color = TYPE_COLORS[type] || '#888';
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '8px',
        backgroundColor: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color} />
    </div>
  );
}

export default function Content({ client }) {
  const { profile } = useAuth();
  const isAgency = profile?.role === 'agency';

  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    content_type: 'post',
    scheduled_date: '',
    media_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchContent() {
    try {
      const data = await api(`/content?client_id=${client.id}`);
      setContent(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch content:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (client?.id) fetchContent();
  }, [client?.id]);

  async function handleCreateContent(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/content', {
        method: 'POST',
        body: {
          ...newContent,
          client_id: client.id,
          status: 'pending_approval',
        },
      });
      setShowModal(false);
      setNewContent({ title: '', description: '', content_type: 'post', scheduled_date: '', media_url: '' });
      fetchContent();
    } catch (err) {
      console.error('Failed to create content:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api(`/content/${id}`, {
        method: 'PUT',
        body: { status },
      });
      fetchContent();
    } catch (err) {
      console.error('Failed to update content:', err);
    }
  }

  async function submitFeedback(id) {
    const text = feedback[id];
    if (!text?.trim()) return;
    try {
      await api(`/content/${id}`, {
        method: 'PUT',
        body: { status: 'revision_requested', feedback: text },
      });
      setFeedback((prev) => ({ ...prev, [id]: '' }));
      fetchContent();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const contentByDate = {};
  content.forEach((item) => {
    if (item.scheduled_date) {
      const dateKey = item.scheduled_date.slice(0, 10);
      if (!contentByDate[dateKey]) contentByDate[dateKey] = [];
      contentByDate[dateKey].push(item);
    }
  });

  const pendingContent = content.filter(
    (item) => item.status === 'pending_approval' || item.status === 'revision_requested'
  );

  const pillars = client?.content_pillars || [];

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* ── Content Pillars ── */}
      <h2 style={{ margin: '0 0 16px', fontSize: '20px', color: 'var(--color-text)' }}>
        Content Pillars
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {pillars.length > 0 ? (
          pillars.map((pillar, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  opacity: 0.15,
                  margin: '0 auto 12px',
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  lineHeight: 1.4,
                }}
              >
                {typeof pillar === 'string' ? pillar : pillar.name}
              </p>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
            No content pillars defined yet.
          </p>
        )}
      </div>

      {/* ── Content Calendar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>
          <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Content Calendar
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() =>
              setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '14px',
            }}
          >
            &larr;
          </button>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text)',
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() =>
              setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '14px',
            }}
          >
            &rarr;
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '32px',
          overflowX: 'auto',
        }}
      >
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                padding: '4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {/* Empty cells for offset */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 52 }} />
          ))}
          {daysInMonth.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayItems = contentByDate[dateKey] || [];
            const today = isToday(day);
            return (
              <div
                key={dateKey}
                style={{
                  minHeight: 52,
                  padding: '4px',
                  borderRadius: '6px',
                  backgroundColor: today ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: today ? '1px solid var(--color-accent)' : '1px solid transparent',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: today ? 700 : 400,
                    color: today ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    marginBottom: '2px',
                  }}
                >
                  {format(day, 'd')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      title={`${item.title} (${item.content_type})`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: TYPE_COLORS[item.content_type] || '#888',
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          {CONTENT_TYPES.map((type) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: TYPE_COLORS[type],
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content Approval Section ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>
          Content Approval
        </h2>
        {isAgency && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            Upload Content
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading content...</p>
      ) : pendingContent.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            No content pending approval.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingContent.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '16px 20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                {/* Thumbnail or icon */}
                {item.media_url ? (
                  <img
                    src={item.media_url}
                    alt={item.title}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <ContentTypeIcon type={item.content_type} />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '4px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text)' }}>
                      {item.title}
                    </h3>
                    <StatusBadge status={item.status} />
                    <TypeBadge type={item.content_type} />
                  </div>

                  {item.description && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.description}
                    </p>
                  )}

                  {item.scheduled_date && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Scheduled: {format(parseISO(item.scheduled_date), 'MMM d, yyyy')}
                    </p>
                  )}

                  {/* Client actions */}
                  {!isAgency && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <textarea
                          placeholder="Add feedback or revision notes..."
                          value={feedback[item.id] || ''}
                          onChange={(e) =>
                            setFeedback((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          rows={2}
                          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          onClick={() => updateStatus(item.id, 'approved')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 14px',
                            backgroundColor: '#064e3b',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#34d399',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => submitFeedback(item.id)}
                          disabled={!feedback[item.id]?.trim()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 14px',
                            backgroundColor: feedback[item.id]?.trim() ? '#78350f' : '#2a2a2a',
                            border: 'none',
                            borderRadius: '6px',
                            color: feedback[item.id]?.trim() ? '#fbbf24' : '#666',
                            cursor: feedback[item.id]?.trim() ? 'pointer' : 'default',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={14} />
                          Request Revision
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Agency actions */}
                  {isAgency && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {ALL_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(item.id, status)}
                          disabled={item.status === status}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border)',
                            background: item.status === status ? STATUS_COLORS[status].bg : 'none',
                            color:
                              item.status === status
                                ? STATUS_COLORS[status].text
                                : 'var(--color-text-secondary)',
                            cursor: item.status === status ? 'default' : 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            opacity: item.status === status ? 1 : 0.7,
                          }}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Content Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Upload New Content">
        <form
          onSubmit={handleCreateContent}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              required
              value={newContent.title}
              onChange={(e) => setNewContent((prev) => ({ ...prev, title: e.target.value }))}
              style={inputStyle}
              placeholder="Content title"
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={newContent.description}
              onChange={(e) =>
                setNewContent((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              style={inputStyle}
              placeholder="Brief description of the content"
            />
          </div>
          <div>
            <label style={labelStyle}>Content Type</label>
            <select
              value={newContent.content_type}
              onChange={(e) =>
                setNewContent((prev) => ({ ...prev, content_type: e.target.value }))
              }
              style={selectStyle}
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Scheduled Date</label>
            <input
              type="date"
              required
              value={newContent.scheduled_date}
              onChange={(e) =>
                setNewContent((prev) => ({ ...prev, scheduled_date: e.target.value }))
              }
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Media URL</label>
            <input
              type="url"
              value={newContent.media_url}
              onChange={(e) =>
                setNewContent((prev) => ({ ...prev, media_url: e.target.value }))
              }
              style={inputStyle}
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 20px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              marginTop: '4px',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Plus size={16} />
            {submitting ? 'Uploading...' : 'Upload Content'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
