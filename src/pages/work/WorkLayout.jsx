import { createElement } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sun, Users as UsersIcon, GitBranch, Film, LogOut } from 'lucide-react';

const NAV = [
  { to: '/work/today',    label: 'Today',    icon: Sun },
  { to: '/work/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/work/content',  label: 'Content',  icon: Film },
];

export default function WorkLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
            LRD Media
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            My Work
          </div>
        </div>

        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
              textDecoration: 'none',
              transition: 'background-color 0.15s, color 0.15s',
            })}
          >
            {createElement(icon, { size: 16 })}
            {label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={navButtonStyle}
          >
            <UsersIcon size={16} />
            Clients
          </button>
          <button onClick={signOut} style={navButtonStyle}>
            <LogOut size={16} />
            Logout
          </button>
          {profile?.email && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', padding: '6px 12px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.email}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px', overflowX: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '9px 12px',
  borderRadius: '6px',
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};
