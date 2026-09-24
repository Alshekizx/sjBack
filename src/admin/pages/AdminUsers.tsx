import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import type { AdminRole } from '../../lib/supabase';
import { adminApi } from '../../lib/adminApi';

interface AdminUserRecord {
  id: string;
  full_name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: '#ef4444',
  admin: '#f59e0b',
  content_manager: '#10b981',
  page_manager: '#6366f1',
  support_manager: '#8b5cf6',
};

const MOCK_ADMINS: AdminUserRecord[] = [
  { id: '1', full_name: 'Super Administrator', email: 'admin@sjlawacademy.com', role: 'super_admin', is_active: true, created_at: '2024-01-01', last_login: '2024-03-16' },
  { id: '2', full_name: 'Content Manager', email: 'manager@sjlawacademy.com', role: 'content_manager', is_active: true, created_at: '2024-01-10', last_login: '2024-03-15' },
  { id: '3', full_name: 'Adaora Eze', email: 'adaora@sjlawacademy.com', role: 'page_manager', is_active: true, created_at: '2024-02-01', last_login: '2024-03-14' },
  { id: '4', full_name: 'Kelechi Obi', email: 'kelechi@sjlawacademy.com', role: 'support_manager', is_active: false, created_at: '2024-02-15', last_login: '2024-03-01' },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  content_manager: 'Content Manager',
  page_manager: 'Page Manager',
  support_manager: 'Support Manager',
};

export default function AdminUsers() {
  const { hasPermission } = useAuth();
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'content_manager' as AdminRole });

  useEffect(() => { if (hasPermission(['super_admin'])) adminApi.list<AdminUserRecord>('admin-users').then(setAdmins).catch(err => setError(err.message)); }, [hasPermission(['super_admin'])]);

  if (!hasPermission(['super_admin'])) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24" style={{ color: '#6b7280' }}>
        <div className="text-4xl mb-4">🔒</div>
        <div className="text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Access Restricted</div>
        <div className="text-xs">Only Super Admins can manage administrator accounts.</div>
      </div>
    );
  }


  const handleCreate = async () => {
    if (!form.full_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a name and a valid email address.'); return; }
    const newAdmin: AdminUserRecord = {
      id: crypto.randomUUID(),
      ...form,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    try { await adminApi.save('admin-users', newAdmin); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save administrator record.'); return; }
    setAdmins((prev) => [...prev, newAdmin]);
    setShowForm(false);
    setForm({ full_name: '', email: '', role: 'content_manager' });
  };

  const toggleActive = async (id: string) => {
    const admin = admins.find(a => a.id === id);
    if (!admin) return;
    const updated = { ...admin, is_active: !admin.is_active };
    try { await adminApi.save('admin-users', updated); setAdmins((prev) => prev.map((a) => a.id === id ? updated : a)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update administrator.'); }
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Administrator Records</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#6366f1', color: 'white' }}
        >
          + Add Admin
        </button>
      </div>
      <p className="text-sm text-slate-400">These records do not create sign-in accounts or change access. Manage administrator sign-in access in Supabase Authentication.</p>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(ROLE_LABELS) as [AdminRole, string][]).map(([role, label]) => (
          <div key={role} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[role] }} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Administrator', 'Role', 'Status', 'Created', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin, i) => (
              <tr
                key={admin.id}
                style={{ borderBottom: i < admins.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: ROLE_COLORS[admin.role] + '30', color: ROLE_COLORS[admin.role] }}>
                      {admin.full_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{admin.full_name}</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>{admin.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ color: ROLE_COLORS[admin.role], background: ROLE_COLORS[admin.role] + '20' }}>
                    {ROLE_LABELS[admin.role]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs" style={{ color: admin.is_active ? '#10b981' : '#ef4444' }}>
                    {admin.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {new Date(admin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {admin.last_login ? new Date(admin.last_login).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td className="px-5 py-3.5">
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => toggleActive(admin.id)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: admin.is_active ? '#2d1515' : '#1f2d1f', color: admin.is_active ? '#fca5a5' : '#86efac' }}
                    >
                      {admin.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Add Administrator Record</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {[
                { label: 'Full Name', field: 'full_name', type: 'text' },
                { label: 'Email Address', field: 'email', type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{label}</label>
                  <input id={field}
                    type={type}
                    value={(form as any)[field]}
                    onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="adminusers-field-2" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Role</label>
                <select id="adminusers-field-2"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value as AdminRole }))}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                >
                  <option value="admin">Admin</option>
                  <option value="content_manager">Content Manager</option>
                  <option value="page_manager">Page Manager</option>
                  <option value="support_manager">Support Manager</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
