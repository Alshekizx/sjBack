import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

interface Payment {
  id: string;
  student_name: string;
  student_email: string;
  amount: number;
  plan: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  reference: string;
  date: string;
  expires?: string;
}

const MOCK_PAYMENTS: Payment[] = [
  { id: '1', student_name: 'Adaeze Okonkwo', student_email: 'adaeze@gmail.com', amount: 15000, plan: 'Annual — 300L', status: 'success', reference: 'TXN-2024-001', date: '2024-03-16', expires: '2025-03-16' },
  { id: '2', student_name: 'Ngozi Obi', student_email: 'ngozi.obi@gmail.com', amount: 15000, plan: 'Annual — 500L', status: 'success', reference: 'TXN-2024-002', date: '2024-03-15', expires: '2025-03-15' },
  { id: '3', student_name: 'Ibrahim Musa', student_email: 'ibrahim.musa@gmail.com', amount: 8000, plan: 'Term — 300L', status: 'success', reference: 'TXN-2024-003', date: '2024-03-14', expires: '2024-06-14' },
  { id: '4', student_name: 'Oluwaseun Adeyemi', student_email: 'oluwaseun.adeyemi@hotmail.com', amount: 15000, plan: 'Annual — 100L', status: 'failed', reference: 'TXN-2024-004', date: '2024-03-13' },
  { id: '5', student_name: 'Chioma Ezeh', student_email: 'chioma.ezeh@gmail.com', amount: 15000, plan: 'Annual — 200L', status: 'pending', reference: 'TXN-2024-005', date: '2024-03-12' },
  { id: '6', student_name: 'Chukwuemeka Nwachukwu', student_email: 'chukwuemeka@yahoo.com', amount: 15000, plan: 'Annual — 200L', status: 'success', reference: 'TXN-2024-006', date: '2024-03-10', expires: '2025-03-10' },
  { id: '7', student_name: 'Fatima Abdullahi', student_email: 'fatima.abdullahi@gmail.com', amount: 3000, plan: 'Trial — 400L', status: 'refunded', reference: 'TXN-2024-007', date: '2024-03-08' },
];

const STATUS_COLORS: Record<string, string> = {
  success: '#10b981',
  failed: '#ef4444',
  pending: '#f59e0b',
  refunded: '#6b7280',
};

export default function PaymentsManager() {
  const [filter, setFilter] = useState({ status: 'All', search: '' });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([adminApi.list<any>('payments'), adminApi.list<any>('students')]).then(([payments, students]) => setPayments(payments.map(payment => { const student = students.find(item => item.id === payment.student_id); return { ...payment, student_name: student?.full_name || payment.student_name || 'Unknown student', student_email: student?.email || payment.student_email || '', date: payment.paid_at || payment.created_at || payment.date, amount: Number(payment.amount || 0) }; }))).catch(err => setError(err.message)); }, []);

  const filtered = payments.filter((p) => {
    const matchStatus = filter.status === 'All' || p.status === filter.status;
    const matchSearch = !filter.search ||
      p.student_name.toLowerCase().includes(filter.search.toLowerCase()) ||
      p.reference.toLowerCase().includes(filter.search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = payments.filter(p => p.status === 'success').reduce((a, b) => a + b.amount, 0);

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Subscriptions & Payments</h1>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₦${(totalRevenue).toLocaleString()}`, color: '#10b981' },
          { label: 'Successful', value: payments.filter(p => p.status === 'success').length.toString(), color: '#10b981' },
          { label: 'Failed Payments', value: payments.filter(p => p.status === 'failed').length.toString(), color: '#ef4444' },
          { label: 'Pending', value: payments.filter(p => p.status === 'pending').length.toString(), color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filter.search}
          onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
          placeholder="Search by name or reference..."
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0', width: '260px' }}
        />
        {['All', 'success', 'failed', 'pending', 'refunded'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(f => ({ ...f, status: s }))}
            className="px-3 py-2 rounded-lg text-xs capitalize transition-all"
            style={{
              background: filter.status === s ? '#6366f1' : '#1a1d27',
              color: filter.status === s ? 'white' : '#6b7280',
              border: '1px solid',
              borderColor: filter.status === s ? '#6366f1' : '#2a2d3e',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Student', 'Plan', 'Amount', 'Reference', 'Status', 'Date', 'Expires'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{p.student_name}</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{p.student_email}</div>
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: '#94a3b8' }}>{p.plan}</td>
                <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
                  ₦{p.amount.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
                  {p.reference}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: STATUS_COLORS[p.status], background: STATUS_COLORS[p.status] + '20' }}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: p.expires ? '#94a3b8' : '#6b7280' }}>
                  {p.expires ? new Date(p.expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: '#6b7280' }}>
        💡 Payment verification and webhook processing runs via Supabase Edge Functions. Paystack secret credentials are never exposed to the browser.
      </p>
    </div>
  );
}
