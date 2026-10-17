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

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  content_manager: 'Content Manager',
  page_manager: 'Page Manager',
  support_manager: 'Support Manager',
};

export default function AdminUsers() {
  const { hasPermission, user } = useAuth();
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'content_manager' as AdminRole, password: '', existing_user: false });

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
    if (!form.existing_user && form.password.length < 12) { setError('Use a password with at least 12 characters.'); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await adminApi.create<AdminUserRecord>('admin-users', form);
      setAdmins(prev => [...prev.filter(admin => admin.id !== saved.id), saved]);
      setNotice(form.existing_user ? `Administrator access assigned to ${saved.email}. They should sign in using their existing password.` : `Login account created for ${saved.email}. They can sign in to this admin website using the password you just set.`);
      setShowForm(false);
      setForm({ full_name: '', email: '', role: 'content_manager', password: '', existing_user: false });
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create administrator.'); }
    finally { setSaving(false); }
  };

  const changeRole = async (admin: AdminUserRecord, role: AdminRole) => {
    setError('');
    try {
      const saved = await adminApi.save('admin-users', { ...admin, role });
      setAdmins(prev => prev.map(item => item.id === saved.id ? saved : item));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to change role.'); }
  };

  const toggleActive = async (id: string) => {
    const admin = admins.find(a => a.id === id);
    if (!admin) return;
    const updated = { ...admin, is_active: !admin.is_active };
    try { const saved = await adminApi.save('admin-users', updated); setAdmins((prev) => prev.map((a) => a.id === id ? saved : a)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update administrator.'); }
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Administrators</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#6366f1', color: 'white' }}
        >
          + Add Admin
        </button>
      </div>
      <p className="text-sm text-slate-400">Create a login account or assign administrator access to an existing account. New accounts can sign in with the email and password you set.</p>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}
      <p className="text-xs text-slate-400">Administrators added before login account creation was available must be added again with a password, or assigned access using their existing account.</p>

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
                  {admin.id !== user?.id && <select aria-label={`Role for ${admin.email}`} value={admin.role} onChange={event => void changeRole(admin, event.target.value as AdminRole)} className="block mt-2 text-xs rounded p-1 bg-slate-800 text-slate-200">
                    {(Object.entries(ROLE_LABELS) as [AdminRole, string][]).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                  </select>}
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
                  {admin.id !== user?.id && (
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
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Add Administrator</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.existing_user} onChange={e => setForm(f => ({ ...f, existing_user: e.target.checked, password: '' }))} />Assign access to an existing account</label>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {[
                { label: 'Full Name', field: 'full_name', type: 'text' },
                { label: 'Email Address', field: 'email', type: 'email' },
                ...(!form.existing_user ? [{ label: 'Password (at least 12 characters)', field: 'password', type: 'password' }] : []),
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
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="content_manager">Content Manager</option>
                  <option value="page_manager">Page Manager</option>
                  <option value="support_manager">Support Manager</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>Cancel</button>
              <button disabled={saving} onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>{saving ? 'Saving...' : 'Save Administrator'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
