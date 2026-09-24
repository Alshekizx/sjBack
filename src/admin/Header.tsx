import { useState } from 'react';
import { useAuth } from './AuthContext';

const BREADCRUMB_MAP: Record<string, string[]> = {
  dashboard: ['Dashboard'],
  courses: ['Academic Content', 'Courses & Levels'],
  lessons: ['Academic Content', 'Lessons & Topics'],
  resources: ['Academic Content', 'Resources & PDFs'],
  'case-law': ['Academic Content', 'Case Law'],
  mcq: ['Question Bank', 'MCQ Questions'],
  essays: ['Question Bank', 'Essay Questions'],
  exams: ['Question Bank', 'Mock Exams'],
  'pages-list': ['Website Pages', 'All Pages'],
  'pages-editor': ['Website Pages', 'Page Editor'],
  media: ['Media Manager'],
  'students-list': ['Students', 'All Students'],
  'students-activity': ['Students', 'Activity'],
  payments: ['Subscriptions & Payments'],
  notifications: ['Notifications'],
  support: ['Support & Tickets'],
  analytics: ['Analytics'],
  audit: ['Audit Log'],
  'admin-users': ['Admin Users'],
};

interface HeaderProps {
  activePage: string;
  onMenuToggle: () => void;
  onNavigate: (page: string) => void;
}

export default function Header({ activePage, onMenuToggle, onNavigate }: HeaderProps) {
  const { user, signOut, hasPermission } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const breadcrumbs = BREADCRUMB_MAP[activePage] || ['Dashboard'];

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    page_manager: 'Page Manager',
    content_manager: 'Content Manager',
    support_manager: 'Support Manager',
  };

  return (
    <header
      className="flex items-center gap-4 px-6 h-16 flex-shrink-0"
      style={{ background: '#13161f', borderBottom: '1px solid #2a2d3e' }}
    >
      {/* Mobile menu toggle */}
      <button
        aria-label="Open navigation"
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md"
        style={{ color: '#6b7280' }}
      >
        ☰
      </button>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-2">
            {i > 0 && <span style={{ color: '#2a2d3e' }}>/</span>}
            <span
              className="text-sm"
              style={{ color: i === breadcrumbs.length - 1 ? '#e2e8f0' : '#6b7280' }}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {hasPermission(['admin', 'support_manager']) && <button onClick={() => onNavigate('notifications')} aria-label="Open notifications" className="p-2 text-slate-400">🔔</button>}

      {/* Profile */}
      <div className="relative">
        <button
          aria-label="Account menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
          style={{ background: profileOpen ? '#1a1d27' : 'transparent', border: '1px solid transparent' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: '#6366f1', color: 'white' }}>
            {user?.full_name?.[0] || 'A'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{user?.full_name}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{roleLabel[user?.role || ''] || 'Admin'}</div>
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>▼</span>
        </button>

        {profileOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
            style={{ background: '#1a1d27', border: '1px solid #2a2d3e', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{user?.full_name}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{user?.email}</div>
              <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-xs" style={{ background: '#1f2235', color: '#818cf8' }}>
                {roleLabel[user?.role || ''] || 'Admin'}
              </div>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setProfileOpen(false); signOut(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                style={{ color: '#f87171' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2d3e')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>🚪</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
