import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { Save, FileText } from 'lucide-react';

const noteFields = [
  { key: 'ibp_profile', label: 'Full IBP Profile' },
  { key: 'content_worked', label: "What's Worked in Content" },
  { key: 'ads_worked', label: "What's Worked in Ads" },
  { key: 'personality_notes', label: 'Client Personality Notes' },
  { key: 'strategy_call_summaries', label: 'Previous Strategy Call Summaries' },
  { key: 'objections_raised', label: "Objections They've Raised" },
  { key: 'free_notes', label: 'Free Notes' },
];

const emptyNotes = Object.fromEntries(noteFields.map((f) => [f.key, '']));

const textareaStyle = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'vertical',
  lineHeight: 1.6,
  minHeight: '120px',
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '10px',
  display: 'block',
  fontWeight: 500,
};

export default function AgencyNotes() {
  const { client } = useOutletContext();
  const [notes, setNotes] = useState({ ...emptyNotes });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const debounceRef = useRef(null);
  const notesRef = useRef(notes);

  // Keep ref in sync so debounced save always uses latest values
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!client?.id) return;
    async function fetchNotes() {
      try {
        const data = await api(`/notes/${client.id}`);
        if (data) {
          const loaded = {};
          for (const field of noteFields) {
            loaded[field.key] = data[field.key] || '';
          }
          setNotes(loaded);
        }
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [client?.id]);

  const saveNotes = useCallback(
    async (isAuto = false) => {
      if (isAuto) {
        setAutoSaving(true);
      } else {
        setSaving(true);
      }
      setFeedback(null);

      try {
        await api(`/notes/${client.id}`, {
          method: 'PUT',
          body: notesRef.current,
        });
        if (!isAuto) {
          setFeedback({ type: 'success', message: 'Notes saved successfully' });
          setTimeout(() => setFeedback(null), 3000);
        }
      } catch (err) {
        console.error('Failed to save notes:', err);
        setFeedback({
          type: 'error',
          message: isAuto ? 'Auto-save failed' : 'Failed to save notes',
        });
        setTimeout(() => setFeedback(null), 4000);
      } finally {
        setSaving(false);
        setAutoSaving(false);
      }
    },
    [client?.id]
  );

  function handleChange(key, value) {
    setNotes((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);

    // Debounced auto-save after 3 seconds of inactivity
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveNotes(true);
    }, 3000);
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>
        Loading notes...
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} style={{ color: 'var(--color-accent)' }} />
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>
            Agency Notes
          </h2>
          {autoSaving && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                fontStyle: 'italic',
                marginLeft: '4px',
              }}
            >
              Saving...
            </span>
          )}
        </div>
        <button
          onClick={() => saveNotes(false)}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            backgroundColor:
              feedback.type === 'success'
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            color:
              feedback.type === 'success'
                ? 'rgb(74, 222, 128)'
                : 'rgb(252, 129, 129)',
            border:
              feedback.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.25)'
                : '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          {feedback.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {noteFields.map((field) => (
          <div
            key={field.key}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <label style={labelStyle}>{field.label}</label>
            <textarea
              value={notes[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={5}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              style={textareaStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
