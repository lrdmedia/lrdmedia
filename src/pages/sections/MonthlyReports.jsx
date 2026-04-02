import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { FileText, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const emptyReport = {
  month: '',
  reach: '',
  impressions: '',
  enquiries: '',
  new_clients: '',
  ad_spend: '',
  cost_per_lead: '',
  what_worked: '',
  plan_next_month: '',
  ad_performance_summary: '',
};

const numericFields = [
  { key: 'reach', label: 'Reach' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'enquiries', label: 'Enquiries Generated' },
  { key: 'new_clients', label: 'New Clients / Members' },
  { key: 'ad_spend', label: 'Ad Spend', currency: true },
  { key: 'cost_per_lead', label: 'Cost Per Lead', currency: true },
];

const textFields = [
  { key: 'ad_performance_summary', label: 'Ad Performance Summary' },
  { key: 'what_worked', label: 'What Worked This Month' },
  { key: 'plan_next_month', label: 'Plan For Next Month' },
];

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
  colorScheme: 'dark',
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
  display: 'block',
};

const cardStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  overflow: 'hidden',
};

export default function MonthlyReports({ client }) {
  const { profile } = useAuth();
  const isAgency = profile?.role === 'agency';

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState({ ...emptyReport });
  const [saving, setSaving] = useState(false);

  async function fetchReports() {
    try {
      const data = await api(`/reports?client_id=${client.id}`);
      const items = Array.isArray(data) ? data : data.reports || [];
      items.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
      setReports(items);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (client?.id) fetchReports();
  }, [client?.id]);

  const visibleReports = isAgency
    ? reports
    : reports.filter((r) => r.published);

  function openCreate() {
    setEditingReport(null);
    setForm({ ...emptyReport });
    setShowModal(true);
  }

  function openEdit(report) {
    setEditingReport(report);
    setForm({
      month: report.month || '',
      reach: report.reach ?? '',
      impressions: report.impressions ?? '',
      enquiries: report.enquiries ?? '',
      new_clients: report.new_clients ?? '',
      ad_spend: report.ad_spend ?? '',
      cost_per_lead: report.cost_per_lead ?? '',
      what_worked: report.what_worked || '',
      plan_next_month: report.plan_next_month || '',
      ad_performance_summary: report.ad_performance_summary || '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingReport(null);
    setForm({ ...emptyReport });
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        client_id: client.id,
        reach: form.reach !== '' ? Number(form.reach) : null,
        impressions: form.impressions !== '' ? Number(form.impressions) : null,
        enquiries: form.enquiries !== '' ? Number(form.enquiries) : null,
        new_clients: form.new_clients !== '' ? Number(form.new_clients) : null,
        ad_spend: form.ad_spend !== '' ? Number(form.ad_spend) : null,
        cost_per_lead: form.cost_per_lead !== '' ? Number(form.cost_per_lead) : null,
      };

      if (editingReport) {
        await api(`/reports/${editingReport.id}`, {
          method: 'PUT',
          body,
        });
      } else {
        await api('/reports', {
          method: 'POST',
          body,
        });
      }

      closeModal();
      fetchReports();
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(report) {
    try {
      await api(`/reports/${report.id}`, {
        method: 'PUT',
        body: { published: true },
      });
      fetchReports();
    } catch (err) {
      console.error('Failed to publish report:', err);
    }
  }

  function formatMonth(dateStr) {
    if (!dateStr) return 'Unknown';
    try {
      // Handle both "2026-03" and "2026-03-01" formats
      const normalized = dateStr.length === 7 ? dateStr + '-01' : dateStr;
      return format(new Date(normalized + 'T00:00:00'), 'MMMM yyyy');
    } catch {
      return dateStr;
    }
  }

  function formatNumber(val) {
    if (val == null || val === '') return '\u2014';
    return Number(val).toLocaleString();
  }

  function formatCurrency(val) {
    if (val == null || val === '') return '\u2014';
    return '$' + Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>
          Monthly Reports
        </h2>
        {isAgency && (
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Plus size={16} />
            Create Report
          </button>
        )}
      </div>

      {visibleReports.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>No reports yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibleReports.map((report) => {
            const isExpanded = expandedId === report.id;

            return (
              <div key={report.id} style={cardStyle}>
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={18} style={{ color: 'var(--color-accent)' }} />
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                      }}
                    >
                      {formatMonth(report.month)}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: report.published
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(250, 204, 21, 0.15)',
                        color: report.published
                          ? 'rgb(74, 222, 128)'
                          : 'rgb(250, 204, 21)',
                      }}
                    >
                      {report.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '0 20px 20px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Metrics grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginTop: '20px',
                      }}
                    >
                      {numericFields.map((field) => (
                        <div
                          key={field.key}
                          style={{
                            backgroundColor: 'var(--color-bg)',
                            borderRadius: '6px',
                            padding: '12px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '4px',
                            }}
                          >
                            {field.label}
                          </div>
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 600,
                              color: 'var(--color-text)',
                            }}
                          >
                            {field.currency
                              ? formatCurrency(report[field.key])
                              : formatNumber(report[field.key])}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Text blocks */}
                    {textFields.map((field) => {
                      const val = report[field.key];
                      if (!val && !isAgency) return null;
                      return (
                        <div key={field.key} style={{ marginTop: '20px' }}>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '8px',
                            }}
                          >
                            {field.label}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '14px',
                              color: val ? 'var(--color-text)' : 'var(--color-text-secondary)',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.7,
                            }}
                          >
                            {val || 'Not set'}
                          </p>
                        </div>
                      );
                    })}

                    {/* Published date */}
                    {report.published && report.published_at && (
                      <div
                        style={{
                          marginTop: '16px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Published {format(new Date(report.published_at), 'MMM d, yyyy')}
                      </div>
                    )}

                    {/* Agency actions */}
                    {isAgency && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '20px',
                          paddingTop: '16px',
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <button
                          onClick={() => openEdit(report)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Edit
                        </button>
                        {!report.published && (
                          <button
                            onClick={() => handlePublish(report)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              backgroundColor: 'rgb(34, 197, 94)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            <Send size={14} />
                            Publish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingReport ? 'Edit Report' : 'Create Report'}
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Month picker */}
            <div>
              <label style={labelStyle}>Month</label>
              <input
                type="month"
                value={
                  form.month
                    ? form.month.substring(0, 7)
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  updateForm('month', val ? val + '-01' : '');
                }}
                required
                style={inputStyle}
              />
            </div>

            {/* Numeric fields in a 2-col grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              {numericFields.map((field) => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <input
                    type="number"
                    value={form[field.key]}
                    onChange={(e) => updateForm(field.key, e.target.value)}
                    placeholder={field.currency ? '0.00' : '0'}
                    step={field.currency ? '0.01' : '1'}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* Text fields */}
            {textFields.map((field) => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <textarea
                  value={form[field.key]}
                  onChange={(e) => updateForm(field.key, e.target.value)}
                  rows={4}
                  style={inputStyle}
                />
              </div>
            ))}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                onClick={closeModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.month}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  opacity: saving || !form.month ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : editingReport ? 'Update Report' : 'Create Report'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
