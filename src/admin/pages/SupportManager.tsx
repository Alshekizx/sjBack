import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

interface Ticket {
  id: string;
  subject: string;
  message?: string;
  student_name: string;
  student_email: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  last_updated: string;
  assigned_to?: string;
}

const MOCK_TICKETS: Ticket[] = [
  { id: 'TKT-001', subject: 'Cannot access 300L Constitutional Law materials', student_name: 'Adaeze Okonkwo', student_email: 'adaeze@gmail.com', status: 'open', priority: 'high', category: 'Access', created_at: '2024-03-16T08:00:00', last_updated: '2024-03-16T08:00:00' },
  { id: 'TKT-002', subject: 'Payment not reflecting after Paystack deduction', student_name: 'Oluwaseun Adeyemi', student_email: 'oluwaseun@hotmail.com', status: 'in_progress', priority: 'urgent', category: 'Billing', created_at: '2024-03-15T14:00:00', last_updated: '2024-03-16T07:30:00', assigned_to: 'Support Team' },
  { id: 'TKT-003', subject: 'PDF download not working on mobile', student_name: 'Ibrahim Musa', student_email: 'ibrahim.musa@gmail.com', status: 'open', priority: 'medium', category: 'Technical', created_at: '2024-03-15T10:00:00', last_updated: '2024-03-15T10:00:00' },
  { id: 'TKT-004', subject: 'Request for account level upgrade', student_name: 'Chioma Ezeh', student_email: 'chioma.ezeh@gmail.com', status: 'resolved', priority: 'low', category: 'Account', created_at: '2024-03-14T09:00:00', last_updated: '2024-03-15T11:00:00', assigned_to: 'Admin' },
  { id: 'TKT-005', subject: 'Mock exam timer not working correctly', student_name: 'Fatima Abdullahi', student_email: 'fatima@gmail.com', status: 'in_progress', priority: 'high', category: 'Technical', created_at: '2024-03-13T16:00:00', last_updated: '2024-03-14T09:00:00', assigned_to: 'Tech Support' },
];

const PRIORITY_COLORS: Record<string, string> = { low: '#6b7280', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
const STATUS_COLORS: Record<string, string> = { open: '#6366f1', in_progress: '#f59e0b', resolved: '#10b981', closed: '#6b7280' };

export default function SupportManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const filtered = tickets.filter((t) => filter === 'all' || t.status === filter);

  useEffect(() => { adminApi.list<Ticket>('support-tickets').then(setTickets).catch(err => setError(err.message)); }, []);

  const updateStatus = async (id: string, status: Ticket['status']) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const updated = { ...ticket, status, last_updated: new Date().toISOString() };
    try { await adminApi.save('support-tickets', updated); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update ticket.'); return; }
    setTickets((prev) => prev.map((t) => t.id === id ? updated : t));
    if (selected?.id === id) setSelected(updated);
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Support & Tickets</h1>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open', count: tickets.filter(t => t.status === 'open').length, color: '#6366f1' },
          { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
          { label: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length, color: '#10b981' },
          { label: 'Urgent', count: tickets.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-2 rounded-lg text-xs capitalize transition-all"
            style={{ background: filter === s ? '#6366f1' : '#1a1d27', color: filter === s ? 'white' : '#6b7280', border: '1px solid', borderColor: filter === s ? '#6366f1' : '#2a2d3e' }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Ticket', 'Student', 'Category', 'Priority', 'Status', 'Created', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket, i) => (
              <tr
                key={ticket.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="text-xs font-mono" style={{ color: '#6366f1' }}>{ticket.id}</div>
                  <div className="text-sm font-medium mt-0.5" style={{ color: '#e2e8f0' }}>{ticket.subject}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-sm" style={{ color: '#e2e8f0' }}>{ticket.student_name}</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{ticket.student_email}</div>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#94a3b8' }}>{ticket.category}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: PRIORITY_COLORS[ticket.priority], background: PRIORITY_COLORS[ticket.priority] + '20' }}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: STATUS_COLORS[ticket.status], background: STATUS_COLORS[ticket.status] + '20' }}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(ticket)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#2a2d3e', color: '#94a3b8' }}>View</button>
                    {ticket.status === 'open' && (
                      <button onClick={() => updateStatus(ticket.id, 'in_progress')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#1f2235', color: '#818cf8' }}>Start work</button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <button onClick={() => updateStatus(ticket.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#1f2d1f', color: '#86efac' }}>Resolve</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <span className="text-xs font-mono" style={{ color: '#6366f1' }}>{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{selected.subject}</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{selected.message || 'No message provided.'}</p>
              {[
                { label: 'Student', value: `${selected.student_name} (${selected.student_email})` },
                { label: 'Category', value: selected.category },
                { label: 'Priority', value: selected.priority },
                { label: 'Status', value: selected.status.replace('_', ' ') },
                { label: 'Created', value: new Date(selected.created_at).toLocaleString('en-GB') },
                { label: 'Assigned To', value: selected.assigned_to || 'Unassigned' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid #2a2d3e' }}>
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
