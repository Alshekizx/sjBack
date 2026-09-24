import { useEffect, useState } from 'react';
import { summarizeMonths } from '../../lib/analytics';
import { adminApi } from '../../lib/adminApi';

interface Stat {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  color: string;
}

const MOCK_STATS: Stat[] = [
  { label: 'Total Students', value: '2,841', change: '+142 this month', positive: true, icon: '🎓', color: '#6366f1' },
  { label: 'Active Subscriptions', value: '1,204', change: '+38 this week', positive: true, icon: '💳', color: '#10b981' },
  { label: 'Published Courses', value: '156', change: '+4 this week', positive: true, icon: '📚', color: '#f59e0b' },
  { label: 'Pending Tickets', value: '12', change: '−3 resolved today', positive: true, icon: '🎫', color: '#ef4444' },
  { label: 'Monthly Revenue', value: '₦4.2M', change: '+18% vs last month', positive: true, icon: '💰', color: '#8b5cf6' },
  { label: 'Trial Accounts', value: '423', change: '−12 converted', positive: true, icon: '⏱️', color: '#06b6d4' },
];

const QUICK_ACTIONS = [
  { label: 'Create Course', icon: '📚', page: 'courses' },
  { label: 'Upload Resource', icon: '📎', page: 'resources' },
  { label: 'Add Case Law', icon: '⚖️', page: 'case-law' },
  { label: 'Create Question', icon: '❓', page: 'mcq' },
  { label: 'Edit Homepage', icon: '🌐', page: 'pages-editor' },
  { label: 'Manage Students', icon: '🎓', page: 'students-list' },
  { label: 'View Payments', icon: '💳', page: 'payments' },
  { label: 'Send Notification', icon: '🔔', page: 'notifications' },
];

const PENDING_ITEMS = [
  { label: 'Draft lessons awaiting publish', count: 7, urgent: false },
  { label: 'Unpublished pages', count: 2, urgent: false },
  { label: 'Support tickets unassigned', count: 5, urgent: true },
  { label: 'Failed payment retries', count: 3, urgent: true },
  { label: 'Subscriptions expiring in 3 days', count: 14, urgent: false },
  { label: 'New student registrations today', count: 28, urgent: false },
];

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stat[]>(MOCK_STATS.map(s => ({ ...s, value: '0', change: 'Live data' })));
  const [activity, setActivity] = useState<any[]>([]);
  const [pending, setPending] = useState<{ label: string; count: number; urgent: boolean }[]>([]);
  const [error, setError] = useState('');

  // Attempt to pull real counts from Supabase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, courses, payments, tickets, audit] = await Promise.all([
          adminApi.list<any>('students'), adminApi.list<any>('courses'), adminApi.list<any>('payments'), adminApi.list<any>('support-tickets'), adminApi.list<any>('audit-log'),
        ]);
        const activeStudents = students.filter(s => s.subscription_status === 'active').length;
        const revenue = summarizeMonths(payments, students)[5]?.revenue || 0;
        const values: Record<string, string> = {
          'Total Students': students.length.toLocaleString(), 'Active Subscriptions': activeStudents.toLocaleString(),
          'Published Courses': courses.filter(c => c.status === 'published').length.toLocaleString(),
          'Pending Tickets': tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length.toLocaleString(),
          'Monthly Revenue': `₦${revenue.toLocaleString()}`, 'Trial Accounts': students.filter(s => s.subscription_status === 'trial').length.toLocaleString(),
        };
        setStats(prev => prev.map(s => ({ ...s, value: values[s.label] ?? '0' })));
        setActivity(audit.slice(0, 6));
        setPending([
          { label: 'Draft courses awaiting publish', count: courses.filter(c => c.status === 'draft').length, urgent: false },
          { label: 'Open support tickets', count: tickets.filter(t => t.status === 'open').length, urgent: true },
          { label: 'Failed payments', count: payments.filter(p => p.status === 'failed').length, urgent: true },
          { label: 'Trial accounts', count: students.filter(s => s.subscription_status === 'trial').length, urgent: false },
        ]);
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard data.'); }
    };
    fetchStats();
  }, []);

  const activityTypeColor: Record<string, string> = {
    enroll: '#6366f1',
    payment: '#10b981',
    exam: '#f59e0b',
    ticket: '#ef4444',
    activity: '#6b7280',
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 transition-all"
            style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl">{stat.icon}</span>
              <div className="w-2 h-2 rounded-full mt-1" style={{ background: stat.color }} />
            </div>
            <div className="text-xl font-semibold" style={{ color: '#e2e8f0' }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{stat.label}</div>
            <div className="text-xs mt-2" style={{ color: stat.positive ? '#10b981' : '#ef4444' }}>{stat.change}</div>
          </div>
        ))}
      </div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Recent Activity</h2>
            <button className="text-xs" style={{ color: '#6366f1' }}>View all</button>
          </div>
          <div className="divide-y" style={{ borderColor: '#2a2d3e' }}>
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: activityTypeColor[item.type] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{item.user || 'Administrator'}</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{item.action} {item.resource && `— ${item.resource}`}</div>
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: '#6b7280' }}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Items */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Needs Attention</h2>
          </div>
          <div className="p-3 space-y-2">
            {pending.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: item.urgent ? '#2d1515' : '#1f2235', border: `1px solid ${item.urgent ? '#7f1d1d' : '#2a2d3e'}` }}
              >
                <span className="text-xs" style={{ color: item.urgent ? '#fca5a5' : '#94a3b8' }}>{item.label}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: item.urgent ? '#7f1d1d' : '#2a2d3e', color: item.urgent ? '#fca5a5' : '#6366f1' }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
              style={{ background: '#13161f', border: '1px solid #2a2d3e' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#1f2235';
                (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#13161f';
                (e.currentTarget as HTMLElement).style.borderColor = '#2a2d3e';
              }}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs text-center" style={{ color: '#94a3b8' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
