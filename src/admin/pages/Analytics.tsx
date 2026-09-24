import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { summarizeMonths } from '../../lib/analytics';

export default function Analytics() {
  const [data, setData] = useState<{ payments: any[]; students: any[]; courses: any[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([adminApi.list<any>('payments'), adminApi.list<any>('students'), adminApi.list<any>('courses')])
      .then(([payments, students, courses]) => setData({ payments, students, courses }))
      .catch(err => setError(err.message));
  }, []);
  const monthlyData = summarizeMonths(data?.payments || [], data?.students || []);
  const maxRevenue = Math.max(1, ...monthlyData.map(row => row.revenue));
  const maxStudents = Math.max(1, ...monthlyData.map(row => row.students));
  const revenue = data?.payments.filter(payment => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  return <div className="p-6 space-y-6 max-w-screen-xl">
    <h1 className="text-lg font-semibold text-slate-200">Analytics Dashboard</h1>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!data ? !error && <p role="status" className="text-slate-400">Loading analytics…</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total revenue', value: `₦${revenue.toLocaleString()}` },
          { label: 'Registered students', value: data.students.length },
          { label: 'Courses', value: data.courses.length },
          { label: 'Published courses', value: data.courses.filter(course => course.status === 'published').length },
        ].map(item => <div key={item.label} className="rounded-xl p-5 bg-[#1a1d27] border border-[#2a2d3e]"><p className="text-2xl text-slate-200">{item.value}</p><p className="text-sm text-slate-400">{item.label}</p></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[{ title: 'Revenue — last 6 months', field: 'revenue' as const, maximum: maxRevenue }, { title: 'New students — last 6 months', field: 'students' as const, maximum: maxStudents }].map(chart => <section key={chart.field} className="rounded-xl p-5 bg-[#1a1d27] border border-[#2a2d3e]">
          <h2 className="text-sm font-semibold text-slate-200 mb-5">{chart.title}</h2>
          <div className="space-y-4">{monthlyData.map(row => <div key={row.key}>
            <div className="flex justify-between text-xs text-slate-400 mb-2"><span>{row.month}</span><span>{chart.field === 'revenue' ? '₦' : ''}{row[chart.field].toLocaleString()}</span></div>
            <div className="h-2 bg-slate-700 rounded-full"><div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${row[chart.field] / chart.maximum * 100}%` }} /></div>
          </div>)}</div>
        </section>)}
      </div>
      <section className="rounded-xl p-5 bg-[#1a1d27] border border-[#2a2d3e]">
        <h2 className="text-sm font-semibold text-slate-200">Student subscription status</h2>
        <p className="text-xs text-slate-400 mt-1">Based on each student’s recorded account status.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">{['active', 'trial', 'expired', 'none'].map(status => <div key={status}><p className="text-xl text-slate-200">{data.students.filter(student => student.subscription_status === status).length}</p><p className="text-xs text-slate-400 capitalize">{status === 'none' ? 'No subscription' : status}</p></div>)}</div>
      </section>
    </>}
  </div>;
}
