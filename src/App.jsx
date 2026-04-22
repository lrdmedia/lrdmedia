import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientPortal from './pages/ClientPortal';
import Overview from './pages/sections/Overview';
import Content from './pages/sections/Content';
import LiveStats from './pages/sections/LiveStats';
import MonthlyReports from './pages/sections/MonthlyReports';
import AgencyNotes from './pages/sections/AgencyNotes';
import WorkLayout from './pages/work/WorkLayout';
import Today from './pages/work/Today';
import Pipeline from './pages/work/Pipeline';
import WorkContent from './pages/work/Content';

function LoadingScreen() {
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

function ProtectedRoute({ children, agencyOnly = false }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (agencyOnly && profile?.role !== 'agency') return <Navigate to="/" replace />;

  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function RootRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'agency') return <Navigate to="/work/today" replace />;

  // Client users get redirected to their own portal
  if (profile?.client_id) {
    return <Navigate to={`/client/${profile.client_id}/overview`} replace />;
  }

  return <Navigate to="/work/today" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute agencyOnly>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/work"
        element={
          <ProtectedRoute agencyOnly>
            <WorkLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="today" replace />} />
        <Route path="today"    element={<Today />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="content"  element={<WorkContent />} />
      </Route>

      <Route
        path="/client/:id"
        element={
          <ProtectedRoute>
            <ClientPortal />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="content" element={<Content />} />
        <Route path="live-stats" element={<LiveStats />} />
        <Route path="reports" element={<MonthlyReports />} />
        <Route path="notes" element={<AgencyNotes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
