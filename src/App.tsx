import { AuthProvider, useAuth } from './admin/AuthContext';
import LoginPage from './admin/LoginPage';
import AdminShell from './admin/AdminShell';

function AdminApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6366f1' }}>
            <span className="text-white font-bold text-sm">SJ</span>
          </div>
          <div className="text-sm" style={{ color: '#6b7280' }}>Loading…</div>
        </div>
      </div>
    );
  }

  return user ? <AdminShell /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  );
}
