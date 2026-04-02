import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { Pencil, Check, X } from 'lucide-react';

const fields = [
  { key: 'business_name', label: 'Business Name' },
  { key: 'service_start_date', label: 'Service Start Date', type: 'date' },
  { key: 'goals_90_day', label: '90-Day Goals', multiline: true },
  { key: 'ideal_buyer_persona', label: 'Ideal Buyer Persona', multiline: true },
  { key: 'core_offer', label: 'Core Offer', multiline: true },
  { key: 'key_proof_points', label: 'Key Proof Points', multiline: true },
];

export default function Overview() {
  const { client, isAgency, clientId, refetchClient } = useOutletContext();
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(field) {
    setEditingField(field.key);
    setEditValue(client?.[field.key] || '');
  }

  async function saveEdit(fieldKey) {
    setSaving(true);
    try {
      await api(`/clients/${clientId}`, {
        method: 'PATCH',
        body: { [fieldKey]: editValue },
      });
      refetchClient();
      setEditingField(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue('');
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
    fontFamily: 'inherit',
    resize: 'vertical',
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: 'var(--color-text)' }}>
        Client Overview
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {fields.map((field) => {
          const isEditing = editingField === field.key;
          const value = client?.[field.key] || '';

          return (
            <div
              key={field.key}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isEditing ? '12px' : '4px',
                }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {field.label}
                </label>
                {isAgency && !isEditing && (
                  <button
                    onClick={() => startEdit(field)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px',
                    }}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div>
                  {field.multiline ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{ ...inputStyle, colorScheme: field.type === 'date' ? 'dark' : undefined }}
                    />
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '10px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      onClick={cancelEdit}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(field.key)}
                      disabled={saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-accent)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: value ? 'var(--color-text)' : 'var(--color-text-secondary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {value || 'Not set'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
