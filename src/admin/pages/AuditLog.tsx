import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

const AUDIT_ENTRIES = [
  { id: 1, user: 'Super Administrator', action: 'Published course', resource: 'Company Law (300L)', timestamp: '2024-03-16T09:45:00', type: 'publish' },
  { id: 2, user: 'Content Manager', action: 'Uploaded resource', resource: 'Constitutional Law Notes.pdf', timestamp: '2024-03-16T09:30:00', type: 'upload' },
  { id: 3, user: 'Super Administrator', action: 'Deactivated student account', resource: 'Oluwaseun Adeyemi', timestamp: '2024-03-15T16:20:00', type: 'user_change' },
  { id: 4, user: 'Super Administrator', action: 'Added case law', resource: 'R v Dudley and Stephens', timestamp: '2024-03-15T14:10:00', type: 'create' },
  { id: 5, user: 'Content Manager', action: 'Edited lesson', resource: 'Offer and Acceptance — Contract Law 200L', timestamp: '2024-03-15T11:00:00', type: 'edit' },
  { id: 6, user: 'Super Administrator', action: 'Created admin account', resource: 'adaora@sjlawacademy.com', timestamp: '2024-03-14T15:00:00', type: 'user_change' },
  { id: 7, user: 'Super Administrator', action: 'Admin login', resource: 'Portal access', timestamp: '2024-03-14T09:00:00', type: 'auth' },
  { id: 8, user: 'Content Manager', action: 'Published mock exam', resource: 'Constitutional Law Mock Exam 1', timestamp: '2024-03-13T14:30:00', type: 'publish' },
];

const TYPE_COLORS: Record<string, string> = {
  publish: '#10b981',
  upload: '#6366f1',
  create: '#f59e0b',
  edit: '#8b5cf6',
  user_change: '#ef4444',
  auth: '#6b7280',
};

const TYPE_ICONS: Record<string, string> = {
  publish: '✅',
  upload: '📎',
  create: '➕',
  edit: '✏️',
  user_change: '👤',
  auth: '🔐',
};

export default function AuditLog() {
  const [entries, setEntries] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { adminApi.list<any>('audit-log').then(setEntries).catch(err => setError(err.message)); }, []);
  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Audit Log</h1>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Type', 'Administrator', 'Action', 'Resource', 'Timestamp'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.id}
                style={{ borderBottom: i < entries.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <span className="text-lg">{TYPE_ICONS[entry.type] || '•'}</span>
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: '#e2e8f0' }}>{entry.user}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ color: TYPE_COLORS[entry.type], background: TYPE_COLORS[entry.type] + '20' }}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: '#94a3b8' }}>{entry.resource}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(entry.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
