import { useState } from 'react';
import { useAuth } from './AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles?: string[];
  children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
  {
    id: 'content', label: 'Academic Content', icon: '📚',
    children: [
      { id: 'academic-levels', label: 'Levels & Pricing' },
      { id: 'courses', label: 'Courses' },
      { id: 'lessons', label: 'Lessons & Topics' },
      { id: 'videos', label: 'Tutorial Videos' },
      { id: 'resources', label: 'Resources & PDFs' },
      { id: 'case-law', label: 'Case Law' },
    ],
  },
  {
    id: 'questions', label: 'Question Bank', icon: '❓',
    children: [
      { id: 'mcq', label: 'MCQ Questions' },
      { id: 'essays', label: 'Essay Questions' },
      { id: 'exams', label: 'Mock Exams' },
    ],
  },
  {
    id: 'pages', label: 'Website Pages', icon: '🌐',
    roles: ['super_admin', 'admin', 'page_manager'],
    children: [
      { id: 'pages-list', label: 'All Pages' },
      { id: 'pages-editor', label: 'Page Editor' },
    ],
  },
  { id: 'media', label: 'Media Manager', icon: '🗂️' },
  {
    id: 'students', label: 'Students', icon: '🎓',
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'students-list', label: 'All Students' },
      { id: 'students-activity', label: 'Activity' },
    ],
  },
  {
    id: 'payments', label: 'Subscriptions & Payments', icon: '💳',
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'notifications', label: 'Notifications', icon: '🔔',
    roles: ['super_admin', 'admin', 'support_manager'],
  },
  {
    id: 'support', label: 'Support & Tickets', icon: '🎫',
    roles: ['super_admin', 'admin', 'support_manager'],
  },
  {
    id: 'analytics', label: 'Analytics', icon: '📊',
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'audit', label: 'Audit Log', icon: '📋',
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'admin-users', label: 'Admin Users', icon: '👤',
    roles: ['super_admin'],
  },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['content']);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return hasPermission(item.roles as any);
  });

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300"
      style={{
        width: collapsed ? '64px' : '240px',
        background: '#13161f',
        borderRight: '1px solid #2a2d3e',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid #2a2d3e', minHeight: '64px' }}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#6366f1' }}>
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'DM Serif Display, serif' }}>SJ</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-semibold whitespace-nowrap" style={{ color: '#e2e8f0' }}>SJ Law Academy</div>
            <div className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Admin Portal</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 admin-scrollbar-hide">
        {visibleItems.map((item) => {
          const isActive = activePage === item.id || item.children?.some((c) => c.id === activePage);
          const isExpanded = expandedGroups.includes(item.id);

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.children) {
                    if (!collapsed) toggleGroup(item.id);
                    else onNavigate(item.children[0].id);
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all group"
                style={{
                  background: isActive ? '#1a1d27' : 'transparent',
                  borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  color: isActive ? '#e2e8f0' : '#6b7280',
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.children && (
                      <span className="text-xs opacity-50">{isExpanded ? '▲' : '▼'}</span>
                    )}
                  </>
                )}
              </button>

              {!collapsed && item.children && isExpanded && (
                <div className="pl-8 py-1">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child.id)}
                      className="w-full text-left px-4 py-2 text-xs transition-all rounded-md"
                      style={{
                        color: activePage === child.id ? '#818cf8' : '#6b7280',
                        background: activePage === child.id ? '#1f2235' : 'transparent',
                      }}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-4 transition-all"
        style={{ borderTop: '1px solid #2a2d3e', color: '#6b7280' }}
      >
        <span className="text-sm">{collapsed ? '→' : '←'}</span>
      </button>
    </aside>
  );
}
