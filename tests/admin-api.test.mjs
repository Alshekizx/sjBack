import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadServer(file, role) {
  const routes = new Map();
  let requestedTable;
  class Hono {
    use() {}
    get(path, handler) { routes.set(`GET ${path}`, handler); }
    put(path, handler) { routes.set(`PUT ${path}`, handler); }
    delete(path, handler) { routes.set(`DELETE ${path}`, handler); }
    post() {}
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: role ? { id: 'admin', app_metadata: { role }, user_metadata: {} } : null }, error: null }) },
    from(table) {
      requestedTable = table;
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { reference: 'test-payment' }, error: null }) }) }) };
    },
  };
  const mocks = { 'npm:hono': { Hono }, 'npm:hono/cors': { cors: () => {} }, 'npm:hono/logger': { logger: () => {} }, './kv_store.tsx': {}, 'jsr:@supabase/supabase-js@2.49.8': { createClient: () => client } };
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'exports', 'Deno', compiled)(name => { assert.ok(name in mocks); return mocks[name]; }, {}, { env: { get: () => 'test' }, serve: () => {} });
  return { routes, table: () => requestedTable };
}
const context = (params = {}, authorized = true) => ({ req: { header: () => authorized ? 'Bearer test' : '', param: key => params[key] }, json: (body, status = 200) => ({ body, status }) });
for (const file of ['../supabase/functions/server/index.tsx', '../supabase/functions/make-server-f63d7d22/index.ts']) {
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
