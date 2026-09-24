export type MonthSummary = { key: string; month: string; revenue: number; students: number };
export function summarizeMonths(payments: { status: string; amount: number | string; paid_at?: string; created_at?: string }[], students: { created_at: string }[], now = new Date()): MonthSummary[] {
  const rows = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }), revenue: 0, students: 0 };
  });
  const rowFor = (value?: string) => {
    const date = new Date(value || '');
    return rows.find(row => row.key === `${date.getFullYear()}-${date.getMonth()}`);
  };
  payments.filter(payment => payment.status === 'success').forEach(payment => {
    const row = rowFor(payment.paid_at || payment.created_at);
    if (row) row.revenue += Number(payment.amount) || 0;
  });
  students.forEach(student => { const row = rowFor(student.created_at); if (row) row.students += 1; });
  return rows;
}
