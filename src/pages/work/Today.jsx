import { useEffect, useState, createElement } from 'react';
import { api } from '../../lib/api';
import { Loader2, Plus, Check, Circle, AlertCircle, Film, GitBranch, Target } from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';

const STAGE_LABELS = {
  lead: 'New',
  qualified: 'Qualified',
  vsl_sent: 'VSL Sent',
  call_booked: 'Call Booked',
  call_done: 'Call Done',
  proposal: 'Proposal',
  signed: 'Signed',
  lost: 'Lost',
};

export default function Today() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d = await api('/work/briefing');
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(task) {
    try {
      await api(`/work/tasks/${task.id}`, { method: 'PATCH', body: { done: !task.done } });
      load();
    } catch (e) { setError(e.message); }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    try {
      await api('/work/tasks', { method: 'POST', body: { title: newTaskTitle.trim() } });
      setNewTaskTitle('');
      load();
    } catch (e) { setError(e.message); }
    finally { setAdding(false); }
  }

  if (loading) return <LoadingBlock />;
  if (error)   return <ErrorBlock msg={error} />;

  const { tasks, pipeline_counts = {}, upcoming_content = [], settings } = data;
  const hotStages = ['lead', 'qualified', 'vsl_sent', 'call_booked', 'call_done', 'proposal'];
  const pipelineHot = hotStages.reduce((sum, s) => sum + (pipeline_counts[s] || 0), 0);

  const target = Number(settings?.revenue_target_monthly || 10000);
  const revenue = Number(settings?.revenue_manual_override || 0);
  const pct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
    now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
          {format(now, 'EEEE, d MMMM yyyy')}
        </div>
        <h1 style={{ margin: 0, fontSize: '26px', color: 'var(--color-text)', fontWeight: 600 }}>
          {greeting}, Liam.
        </h1>
      </header>

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatTile
          icon={AlertCircle}
          label="Tasks due today"
          value={tasks.today.length}
          sub={`${tasks.overdue.length} overdue`}
          accent="warning"
        />
        <StatTile
          icon={GitBranch}
          label="Leads in play"
          value={pipelineHot}
          sub={`${pipeline_counts.signed || 0} signed · ${pipeline_counts.lost || 0} lost`}
        />
        <StatTile
          icon={Film}
          label="Content next 7 days"
          value={upcoming_content.length}
          sub={upcoming_content.filter(c => c.status === 'scheduled').length + ' scheduled'}
        />
        <StatTile
          icon={Target}
          label="Revenue this month"
          value={`£${revenue.toLocaleString()}`}
          sub={`${pct}% of £${target.toLocaleString()} target`}
          accent={pct >= 100 ? 'success' : pct >= 50 ? 'default' : 'warning'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
        {/* Left column: Tasks */}
        <Panel title="Tasks">
          <form onSubmit={addTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task…"
              style={inputStyle}
            />
            <button type="submit" disabled={adding || !newTaskTitle.trim()} style={primaryButton}>
              <Plus size={14} /> Add
            </button>
          </form>

          {tasks.overdue.length > 0 && (
            <TaskGroup title="Overdue" tone="danger" tasks={tasks.overdue} onToggle={toggleTask} />
          )}
          <TaskGroup title="Today" tasks={tasks.today} onToggle={toggleTask} empty="Nothing due today." />
          <TaskGroup
            title="Upcoming"
            tasks={tasks.open.filter(t =>
              !tasks.today.find(x => x.id === t.id) &&
              !tasks.overdue.find(x => x.id === t.id)
            ).slice(0, 10)}
            onToggle={toggleTask}
            empty="Nothing on the horizon."
          />
        </Panel>

        {/* Right column: Pipeline snapshot + Upcoming content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Panel title="Pipeline snapshot">
            {Object.keys(STAGE_LABELS).map((stage) => (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>{STAGE_LABELS[stage]}</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                  {pipeline_counts[stage] || 0}
                </span>
              </div>
            ))}
          </Panel>

          <Panel title="Content next 7 days">
            {upcoming_content.length === 0 ? (
              <EmptyText>Nothing in the pipeline for the next week.</EmptyText>
            ) : (
              upcoming_content.map(c => (
                <div
                  key={c.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontSize: '14px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      {c.status.replace('_', ' ')} · {c.pillar || '—'}
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {c.scheduled_post_date
                      ? format(parseISO(c.scheduled_post_date), 'd MMM')
                      : '—'}
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components -----------------------------------------------------

function StatTile({ icon, label, value, sub, accent }) {
  const color =
    accent === 'warning' ? 'var(--color-warning)' :
    accent === 'success' ? 'var(--color-success)' :
    accent === 'danger'  ? 'var(--color-danger)'  :
    'var(--color-accent)';
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        {createElement(icon, { size: 14, style: { color } })}
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '20px',
    }}>
      <h2 style={{ margin: '0 0 14px', fontSize: '15px', color: 'var(--color-text)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function TaskGroup({ title, tone, tasks, onToggle, empty }) {
  const color = tone === 'danger' ? 'var(--color-danger)' : 'var(--color-text-secondary)';
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        {title}
      </div>
      {tasks.length === 0 ? (
        empty ? <EmptyText>{empty}</EmptyText> : null
      ) : (
        tasks.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} />)
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }) {
  const overdue = task.due_date && !task.done && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 0',
        borderBottom: '1px solid var(--color-border)',
        fontSize: '14px',
      }}
    >
      <button
        onClick={() => onToggle(task)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          color: task.done ? 'var(--color-success)' : 'var(--color-text-secondary)',
        }}
      >
        {task.done ? <Check size={16} /> : <Circle size={16} />}
      </button>
      <span style={{
        flex: 1,
        color: task.done ? 'var(--color-text-secondary)' : 'var(--color-text)',
        textDecoration: task.done ? 'line-through' : 'none',
      }}>
        {task.title}
      </span>
      {task.due_date && (
        <span style={{
          fontSize: '12px',
          color: overdue ? 'var(--color-danger)' : 'var(--color-text-secondary)',
        }}>
          {format(parseISO(task.due_date), 'd MMM')}
        </span>
      )}
    </div>
  );
}

function EmptyText({ children }) {
  return (
    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '8px 0', fontStyle: 'italic' }}>
      {children}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: 'var(--color-text-secondary)' }}>
      <Loader2 size={24} className="spin" />
    </div>
  );
}

function ErrorBlock({ msg }) {
  return (
    <div style={{
      padding: '14px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '8px',
      color: 'var(--color-danger)',
      fontSize: '14px',
    }}>
      {msg}
    </div>
  );
}

const inputStyle = {
  flex: 1,
  padding: '9px 12px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  fontSize: '14px',
  outline: 'none',
};

const primaryButton = {
  display: 'flex',
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
