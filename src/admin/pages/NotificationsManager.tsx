import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

interface Notification {
  id: string;
  title: string;
  message: string;
  target: string;
  status: 'sent' | 'draft' | 'scheduled';
  sent_at?: string;
  recipients: number;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'New Case Law Added: Donoghue v Stevenson', message: 'We\'ve added a comprehensive analysis of Donoghue v Stevenson to the Tort Law section.', target: 'All Students', status: 'sent', sent_at: '2024-03-16T10:00:00', recipients: 2841 },
  { id: '2', title: 'Mock Exam — Constitutional Law Now Live', message: 'The 300L Constitutional Law mock exam is now available. Good luck!', target: '300L Students', status: 'sent', sent_at: '2024-03-14T08:00:00', recipients: 342 },
  { id: '3', title: 'Platform Maintenance — Saturday 2AM–4AM', message: 'Scheduled maintenance this Saturday. Please plan accordingly.', target: 'All Students', status: 'scheduled', recipients: 0 },
  { id: '4', title: 'New Study Resources Available', message: 'Fresh PDF resources have been uploaded for 400L Land Law.', target: '400L Students', status: 'draft', recipients: 0 },
];

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', target: 'All Students', status: 'draft' as Notification['status'] });

  useEffect(() => { adminApi.list<Notification>('notifications').then(setNotifications).catch(err => setError(err.message)); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) { setError('Enter a title and message.'); return; }
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      ...form,
      sent_at: form.status === 'sent' ? new Date().toISOString() : undefined,
      recipients: 0,
    };
    try { await adminApi.save('notifications', newNotif); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save notification.'); return; }
    setNotifications((prev) => [newNotif, ...prev]);
    setShowForm(false);
    setForm({ title: '', message: '', target: 'All Students', status: 'draft' });
  };

  const statusColor: Record<string, string> = { sent: '#10b981', draft: '#f59e0b', scheduled: '#6366f1' };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Notifications</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#6366f1', color: 'white' }}
        >
          + Compose
        </button>
      </div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-xl p-5" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{n.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ color: statusColor[n.status], background: statusColor[n.status] + '20' }}>
                    {n.status}
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>{n.message}</p>
                <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#6b7280' }}>
                  <span>🎯 {n.target}</span>
                  {n.sent_at && <span>📅 {new Date(n.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                  {n.recipients > 0 && <span>👥 {n.recipients.toLocaleString()} recipients</span>}
                </div>
              </div>
              {n.status === 'draft' && (
                <button
                  onClick={async () => { const updated = { ...n, status: 'sent' as const, sent_at: new Date().toISOString(), recipients: 0 }; try { await adminApi.save('notifications', updated); setNotifications(prev => prev.map(x => x.id === n.id ? updated : x)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send notification.'); } }}
                  className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: '#6366f1', color: 'white' }}
                >
                  Send Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Compose Notification</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <div>
                <label htmlFor="notificationsmanager-field-1" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Title</label>
                <input id="notificationsmanager-field-1" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }} />
              </div>
              <div>
                <label htmlFor="notificationsmanager-field-2" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Message</label>
                <textarea id="notificationsmanager-field-2" value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows={4} className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="notificationsmanager-field-3" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Target Audience</label>
                  <select id="notificationsmanager-field-3" value={form.target} onChange={(e) => setForm(f => ({ ...f, target: e.target.value }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}>
                    <option>All Students</option>
                    <option>100L Students</option>
                    <option>200L Students</option>
                    <option>300L Students</option>
                    <option>400L Students</option>
                    <option>500L Students</option>
                    <option>Active Subscribers</option>
                    <option>Trial Users</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="notificationsmanager-field-4" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Send as</label>
                  <select id="notificationsmanager-field-4" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}>
                    <option value="draft">Save as Draft</option>
                    <option value="sent">Send Immediately</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>Cancel</button>
              <button onClick={handleSend} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
                {form.status === 'sent' ? 'Send Now' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
