import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminApi';

interface Student {
  id: string;
  email: string;
  full_name: string;
  academic_level?: string;
  subscription_status: 'active' | 'expired' | 'trial' | 'none';
  created_at: string;
  is_active: boolean;
  last_login?: string;
}

const MOCK_STUDENTS: Student[] = [
  { id: '1', email: 'adaeze@gmail.com', full_name: 'Adaeze Okonkwo', academic_level: '300L', subscription_status: 'active', created_at: '2024-01-10', is_active: true, last_login: '2024-03-16' },
  { id: '2', email: 'chukwuemeka@yahoo.com', full_name: 'Chukwuemeka Nwachukwu', academic_level: '200L', subscription_status: 'active', created_at: '2024-01-15', is_active: true, last_login: '2024-03-15' },
  { id: '3', email: 'fatima.abdullahi@gmail.com', full_name: 'Fatima Abdullahi', academic_level: '400L', subscription_status: 'trial', created_at: '2024-02-01', is_active: true, last_login: '2024-03-14' },
  { id: '4', email: 'oluwaseun.adeyemi@hotmail.com', full_name: 'Oluwaseun Adeyemi', academic_level: '100L', subscription_status: 'expired', created_at: '2024-02-10', is_active: false, last_login: '2024-03-01' },
  { id: '5', email: 'ngozi.obi@gmail.com', full_name: 'Ngozi Obi', academic_level: '500L', subscription_status: 'active', created_at: '2024-02-20', is_active: true, last_login: '2024-03-16' },
  { id: '6', email: 'ibrahim.musa@gmail.com', full_name: 'Ibrahim Musa', academic_level: '300L', subscription_status: 'active', created_at: '2024-03-01', is_active: true, last_login: '2024-03-13' },
  { id: '7', email: 'chioma.ezeh@gmail.com', full_name: 'Chioma Ezeh', academic_level: '200L', subscription_status: 'trial', created_at: '2024-03-05', is_active: true, last_login: '2024-03-12' },
  { id: '8', email: 'tunde.bello@gmail.com', full_name: 'Tunde Bello', academic_level: '400L', subscription_status: 'none', created_at: '2024-03-10', is_active: true, last_login: undefined },
];

const SUB_COLORS: Record<string, string> = {
  active: '#10b981',
  expired: '#ef4444',
  trial: '#f59e0b',
  none: '#6b7280',
};

export default function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ status: 'All', search: '' });
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    const load = async () => {
      try { setStudents(await adminApi.list<Student>('students')); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load students.'); }
    };
    load();
  }, []);

  const filtered = students.filter((s) => {
    const matchStatus = filter.status === 'All' || s.subscription_status === filter.status;
    const matchSearch = !filter.search ||
      s.full_name.toLowerCase().includes(filter.search.toLowerCase()) ||
      s.email.toLowerCase().includes(filter.search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const toggleActive = async (student: Student) => {
    const updated = { ...student, is_active: !student.is_active };
    try { await adminApi.save('students', updated); setStudents((prev) => prev.map((s) => (s.id === student.id ? updated : s))); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update student.'); }
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Student Management</h1>
        <div className="text-sm px-3 py-1.5 rounded-lg" style={{ background: '#1f2235', color: '#818cf8' }}>
          {students.length.toLocaleString()} total students
        </div>
      </div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', count: students.filter(s => s.subscription_status === 'active').length, color: '#10b981' },
          { label: 'Trial Accounts', count: students.filter(s => s.subscription_status === 'trial').length, color: '#f59e0b' },
          { label: 'Expired', count: students.filter(s => s.subscription_status === 'expired').length, color: '#ef4444' },
          { label: 'Suspended', count: students.filter(s => !s.is_active).length, color: '#6b7280' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="text-2xl font-semibold" style={{ color: item.color }}>{item.count}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search students..."
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0', width: '240px' }}
        />
        {['All', 'active', 'trial', 'expired', 'none'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter((f) => ({ ...f, status: s }))}
            className="px-3 py-2 rounded-lg text-xs capitalize transition-all"
            style={{
              background: filter.status === s ? '#6366f1' : '#1a1d27',
              color: filter.status === s ? 'white' : '#6b7280',
              border: '1px solid',
              borderColor: filter.status === s ? '#6366f1' : '#2a2d3e',
            }}
          >
            {s === 'none' ? 'No Subscription' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Student', 'Level', 'Subscription', 'Status', 'Joined', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((student, i) => (
              <tr
                key={student.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: '#2a2d3e', color: '#818cf8' }}>
                      {student.full_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{student.full_name}</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#1f2235', color: '#818cf8' }}>
                    {student.academic_level || '—'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: SUB_COLORS[student.subscription_status], background: SUB_COLORS[student.subscription_status] + '20' }}>
                    {student.subscription_status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs" style={{ color: student.is_active ? '#10b981' : '#ef4444' }}>
                    {student.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {student.last_login ? new Date(student.last_login).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(student)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: '#2a2d3e', color: '#94a3b8' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => toggleActive(student)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: student.is_active ? '#2d1515' : '#1f2d1f', color: student.is_active ? '#fca5a5' : '#86efac' }}
                    >
                      {student.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Student Profile</h2>
              <button onClick={() => setSelected(null)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: '#2a2d3e', color: '#818cf8' }}>
                  {selected.full_name[0]}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#e2e8f0' }}>{selected.full_name}</div>
                  <div className="text-sm" style={{ color: '#6b7280' }}>{selected.email}</div>
                </div>
              </div>
              {[
                { label: 'Academic Level', value: selected.academic_level || 'Not set' },
                { label: 'Subscription', value: selected.subscription_status },
                { label: 'Account Status', value: selected.is_active ? 'Active' : 'Suspended' },
                { label: 'Joined', value: new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Last Login', value: selected.last_login ? new Date(selected.last_login).toLocaleDateString('en-GB') : 'Never' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #2a2d3e' }}>
                  <span className="text-xs" style={{ color: '#6b7280' }}>{row.label}</span>
                  <span className="text-sm capitalize" style={{ color: '#e2e8f0' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
