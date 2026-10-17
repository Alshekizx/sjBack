import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadServer(file, role, options = {}) {
  const routes = new Map();
  let requestedTable;
  class Hono {
    use() {}
    get(path, handler) { routes.set(`GET ${path}`, handler); }
    put(path, handler) { routes.set(`PUT ${path}`, handler); }
    delete(path, handler) { routes.set(`DELETE ${path}`, handler); }
    post(path, handler) { routes.set(`POST ${path}`, handler); }
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: role ? { id: 'admin', app_metadata: { role, admin_active: options.active !== false }, user_metadata: {} } : null }, error: null }), admin: {
      createUser: async payload => { options.created = payload; return { data: { user: { ...payload, id: 'new-admin', created_at: '2026-10-17' } }, error: null }; },
      listUsers: async () => ({ data: { users: options.users || [] }, error: null }),
      getUserById: async () => ({ data: { user: options.target }, error: null }),
      updateUserById: async (id, payload) => { options.updated = { id, ...payload }; return { data: { user: { ...options.target, ...payload, id } }, error: null }; },
    } },
    from(table) {
      requestedTable = table;
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { reference: 'test-payment' }, error: null }) }) }) };
    },
  };
  const mocks = { 'npm:hono': { Hono }, 'npm:hono/cors': { cors: () => {} }, 'npm:hono/logger': { logger: () => {} }, './kv_store.tsx': { get: async () => [], set: async () => {} }, 'jsr:@supabase/supabase-js@2.49.8': { createClient: () => client } };
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'exports', 'Deno', compiled)(name => { assert.ok(name in mocks); return mocks[name]; }, {}, { env: { get: () => 'test' }, serve: () => {} });
  return { routes, table: () => requestedTable };
}
const context = (params = {}, authorized = true) => ({ req: { header: () => authorized ? 'Bearer test' : '', param: key => params[key] }, json: (body, status = 200) => ({ body, status }) });
for (const file of ['../supabase/functions/make-server-f63d7d22/index.ts']) {
  test(`${file}: payment lookup requires authentication`, async () => {
    const { routes } = loadServer(file, null);
    assert.equal((await routes.get('GET /make-server-f63d7d22/payment/:reference')(context({}, false))).status, 401);
  });
  test(`${file}: support roles cannot read payment details or manage admin records`, async () => {
    const { routes } = loadServer(file, 'support_manager');
    assert.equal((await routes.get('GET /make-server-f63d7d22/payment/:reference')(context())).status, 403);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const route = `${method} /make-server-f63d7d22/admin/:collection${method === 'GET' ? '' : '/:id'}`;
      assert.equal((await routes.get(route)(context({ collection: 'admin-users', id: 'test' }))).status, 403);
    }
  });
  test(`${file}: authorized payment lookup uses the payments table`, async () => {
    const server = loadServer(file, 'admin');
    const result = await server.routes.get('GET /make-server-f63d7d22/payment/:reference')(context({ reference: 'test-payment' }));
    assert.equal(result.status, 200);
    assert.equal(result.body.reference, 'test-payment');
    assert.equal(server.table(), 'payments');
  });
}

const serverFile = '../supabase/functions/make-server-f63d7d22/index.ts';
const createContext = body => ({ ...context(), req: { ...context().req, json: async () => body } });
test('super admin creates a real Auth login without returning the password', async () => {
  const options = {};
  const { routes } = loadServer(serverFile, 'super_admin', options);
  const result = await routes.get('POST /make-server-f63d7d22/admin/admin-users')(createContext({ full_name: 'New Admin', email: 'admin@example.test', password: 'long-password-123', role: 'admin' }));
  assert.equal(result.status, 201);
  assert.equal(options.created.app_metadata.role, 'admin');
  assert.equal(options.created.email_confirm, true);
  assert.equal(result.body.id, 'new-admin');
  assert.equal(result.body.password, undefined);
});
test('creation rejects non-super administrators and short passwords', async () => {
  for (const role of ['admin', 'support_manager']) {
    const { routes } = loadServer(serverFile, role);
    assert.equal((await routes.get('POST /make-server-f63d7d22/admin/admin-users')(createContext({}))).status, 403);
  }
  const { routes } = loadServer(serverFile, 'super_admin');
  assert.equal((await routes.get('POST /make-server-f63d7d22/admin/admin-users')(createContext({ full_name: 'Admin', email: 'a@example.test', password: 'short', role: 'admin' }))).status, 400);
});
test('deactivated administrator cannot access authenticated endpoints', async () => {
  const { routes } = loadServer(serverFile, 'super_admin', { active: false });
  assert.equal((await routes.get('GET /make-server-f63d7d22/admin/:collection')(context({ collection: 'admin-users' }))).status, 401);
});
test('existing account promotion preserves other metadata and password', async () => {
  const options = { users: [{ id: 'existing', email: 'a@example.test', app_metadata: { provider: 'email' }, user_metadata: { university: 'School' } }] };
  const { routes } = loadServer(serverFile, 'super_admin', options);
  const result = await routes.get('POST /make-server-f63d7d22/admin/admin-users')(createContext({ full_name: 'Admin', email: 'a@example.test', role: 'content_manager', existing_user: true }));
  assert.equal(result.status, 200);
  assert.equal(options.updated.app_metadata.provider, 'email');
  assert.equal(options.updated.user_metadata.university, 'School');
  assert.equal(options.updated.password, undefined);
});
test('administrator cannot deactivate their own account', async () => {
  const { routes } = loadServer(serverFile, 'super_admin');
  const c = createContext({ role: 'admin', is_active: false });
  c.req.param = key => ({ collection: 'admin-users', id: 'admin' })[key];
  assert.equal((await routes.get('PUT /make-server-f63d7d22/admin/:collection/:id')(c)).status, 400);
});
test('deactivation updates Auth privileges and preserves the account role for reactivation', async () => {
  const options = { target: { id: 'target', email: 'target@example.test', app_metadata: { role: 'admin', provider: 'email' }, user_metadata: {} } };
  const { routes } = loadServer(serverFile, 'super_admin', options);
  const c = createContext({ role: 'admin', is_active: false });
  c.req.param = key => ({ collection: 'admin-users', id: 'target' })[key];
  const result = await routes.get('PUT /make-server-f63d7d22/admin/:collection/:id')(c);
  assert.equal(result.status, 200);
  assert.equal(result.body.is_active, false);
  assert.deepEqual(options.updated.app_metadata, { role: 'admin', provider: 'email', admin_active: false });
});
test('administrator list comes from Auth and excludes student accounts', async () => {
  const options = { users: [{ id: 'student', app_metadata: {}, user_metadata: {} }, { id: 'manager', email: 'm@example.test', app_metadata: { role: 'admin' }, user_metadata: {}, password: 'never-return-this' }] };
  const { routes } = loadServer(serverFile, 'super_admin', options);
  const result = await routes.get('GET /make-server-f63d7d22/admin/:collection')(context({ collection: 'admin-users' }));
  assert.equal(result.body.length, 1);
  assert.equal(result.body[0].id, 'manager');
  assert.equal(result.body[0].password, undefined);
});
