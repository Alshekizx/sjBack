import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function apiFor(status, body) {
  const exports = {};
  const source = readFileSync(new URL('../src/lib/adminApi.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'test-session' } } }) } };
  new Function('require', 'exports', 'fetch', compiled)(() => ({ supabase, supabaseUrl: 'https://example.test', supabaseAnonKey: 'public-key' }), exports,
    async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }));
  return exports.adminApi;
}
test('old deployed backend cannot report a legacy admin record as a login account', async () => {
  await assert.rejects(apiFor(200, [{ id: 'legacy-record', role: 'admin' }]).list('admin-users'), /do not grant login access/);
});
test('missing creation endpoint explains that deployment is required', async () => {
  for (const status of [404, 405]) await assert.rejects(apiFor(status, null).create('admin-users', {}), /Deploy the updated/);
});
test('confirmed Auth account response is accepted', async () => {
  const account = { id: 'auth-user-id', auth_account: true, email: 'admin@example.test', role: 'admin' };
  assert.deepEqual(await apiFor(201, account).create('admin-users', {}), account);
});
test('other collections work without Auth-account markers', async () => {
  assert.deepEqual(await apiFor(200, [{ id: 'course' }]).list('courses'), [{ id: 'course' }]);
});
