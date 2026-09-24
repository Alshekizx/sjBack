import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { summarizeMonths } = exports;

test('six-month summaries cross year boundaries without including prior-year payments', () => {
  const rows = summarizeMonths([
    { status: 'success', amount: '2500', paid_at: '2025-12-15T12:00:00Z' },
    { status: 'success', amount: 999, paid_at: '2024-12-15T12:00:00Z' },
    { status: 'failed', amount: 1000, paid_at: '2025-12-15T12:00:00Z' },
  ], [], new Date(2026, 1, 15));
  assert.equal(rows.length, 6);
  assert.equal(rows[0].key, '2025-8');
  assert.equal(rows[5].key, '2026-1');
  assert.equal(rows.reduce((sum, row) => sum + row.revenue, 0), 2500);
});
test('uses payment date, falls back to creation date, and ignores invalid dates', () => {
  const rows = summarizeMonths([
    { status: 'success', amount: 500, paid_at: '2026-09-10T12:00:00Z', created_at: '2026-08-01T12:00:00Z' },
    { status: 'success', amount: 250, created_at: '2026-09-05T12:00:00Z' },
    { status: 'success', amount: 900, created_at: 'invalid' },
  ], [{ created_at: '2026-09-05T12:00:00Z' }, { created_at: '2025-09-05T12:00:00Z' }], new Date(2026, 8, 24));
  assert.equal(rows[5].revenue, 750);
  assert.equal(rows[5].students, 1);
  assert.equal(rows[4].revenue, 0);
});
test('empty records produce six zero totals', () => {
  assert.ok(summarizeMonths([], []).every(row => row.revenue === 0 && row.students === 0));
});
