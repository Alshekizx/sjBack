import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
const app = new Hono();

const COLLECTIONS = new Set([
  "academic-levels", "courses", "students", "payments", "case-law", "pages", "notifications",
  "support-tickets", "admin-users", "audit-log", "lessons", "resources",
  "mcq", "essays", "exams", "student-activity",
]);
// Collections shared with the student app are written to the relational schema.
// Other internal/admin-only collections remain in KV until their dedicated editor
// has all required relational fields.
const TABLES: Record<string, string> = {
  "academic-levels": "academic_levels",
  "support-tickets": "support_tickets",
  "courses": "courses", "students": "student_profiles", "payments": "payments",
  "case-law": "case_law", "pages": "site_pages", "notifications": "notifications",
  "lessons": "lessons", "resources": "resources", "mcq": "questions", "essays": "questions", "exams": "mock_exams",
};
const TABLE_COLUMNS: Record<string, string[]> = {
  'academic-levels': ['id','level','name','description','duration_months','objectives','price','sort_order','status'],
  'support-tickets': ['id','student_id','subject','message','category','priority','status','assigned_to','created_at','updated_at'],
  courses: ['id','instructor','academic_level_id','code','thumbnail_url','sort_order','title','description','academic_level','status','created_at','updated_at'],
  students: ['id','full_name','email','academic_level','subscription_status','is_active','created_at','updated_at','last_login'],
  payments: ['id','student_id','subscription_id','reference','amount','currency','plan','status','paid_at','created_at','updated_at'],
  'case-law': ['id','case_name','citation','court','year','area_of_law','summary','legal_principles','status','created_at','updated_at'],
  pages: ['id','title','slug','content','meta_description','status','last_edited_at','created_at','updated_at'],
  notifications: ['id','title','message','target','status','scheduled_at','sent_at','created_by','created_at','updated_at'],
  lessons: ['id','course_id','title','description','content','video_url','sort_order','status','created_at','updated_at'],
  resources: ['id','course_id','lesson_id','title','description','storage_path','mime_type','file_size','status','created_at','updated_at'],
  mcq: ['id','course_id','lesson_id','question_type','question','options','correct_answer','explanation','difficulty','marks','status','created_at','updated_at'],
  essays: ['id','course_id','lesson_id','question_type','question','options','correct_answer','explanation','difficulty','marks','status','created_at','updated_at'],
  exams: ['id','title','description','academic_level','duration_minutes','status','opens_at','closes_at','created_at','updated_at'],
};
const database = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const databaseRecord = (collection: string, payload: Record<string, unknown>, id: string) => {
  const allowed = TABLE_COLUMNS[collection] || [];
  const record = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
  record.id = id;
  if (collection === 'pages') {
    delete record.last_edited_by;
    const slug = String(record.slug || '').replace(/^\/+|\/+$/g, '');
    record.slug = !slug || slug === 'home' ? 'home' : slug;
  }
  if (collection === 'mcq' || collection === 'essays') {
    record.question_type = collection === 'mcq' ? 'mcq' : payload.question_type === 'problem' ? 'problem' : 'essay';
    record.question = payload.question || payload.title || '';
  }
  return record;
};

/** Require a real Supabase session and an admin role before touching admin data. */
async function requireAdmin(c: any) {
  const authorization = c.req.header("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user || data.user.app_metadata?.admin_active === false) return null;
  const role = data.user.app_metadata?.role;
  if (!['super_admin', 'admin', 'content_manager', 'page_manager', 'support_manager'].includes(role)) return null;
  return { id: data.user.id, name: data.user.user_metadata?.full_name || data.user.email, role };
}

async function audit(actor: any, action: string, resource: string) {
  const entries = await kv.get("admin:audit-log") || [];
  entries.unshift({ id: crypto.randomUUID(), user: actor.name, action, resource, type: "activity", timestamp: new Date().toISOString() });
  await kv.set("admin:audit-log", entries.slice(0, 500));
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    // Supabase's browser clients send apikey (and often x-client-info) during
    // the OPTIONS preflight. Both must be permitted before admin requests can
    // reach the authenticated routes.
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-f63d7d22/health", (c) => {
  return c.json({ status: "ok", capabilities: ["admin-auth-accounts-v1"] });
});

// Auth is the source of truth. Never store passwords or login roles in KV.
const ADMIN_ROLES = ['super_admin', 'admin', 'content_manager', 'page_manager', 'support_manager'];
const adminView = (user: any) => ({
  auth_account: true, id: user.id, email: user.email || '', full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
  role: user.app_metadata.role, is_active: user.app_metadata.admin_active !== false,
  created_at: user.created_at, last_login: user.last_sign_in_at,
});
async function allAuthUsers() {
  const users: any[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await database().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}
app.post('/make-server-f63d7d22/admin/admin-users', async c => {
  const actor = await requireAdmin(c);
  if (!actor) return c.json({ error: 'Administrator authentication required' }, 401);
  if (actor.role !== 'super_admin') return c.json({ error: 'Only super administrators can manage login access' }, 403);
  const body = await c.req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.full_name || '').trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ADMIN_ROLES.includes(body.role)) return c.json({ error: 'Enter a name, valid email and administrator role.' }, 400);
  const db = database();
  if (body.existing_user === true) {
    const existing = (await allAuthUsers()).find(user => user.email?.toLowerCase() === email);
    if (!existing) return c.json({ error: 'No account exists for this email. Choose Create account instead.' }, 404);
    if (existing.id === actor.id) return c.json({ error: 'You cannot change your own access.' }, 400);
    const { data, error } = await db.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...existing.app_metadata, role: body.role, admin_active: true },
      user_metadata: { ...existing.user_metadata, full_name: name },
    });
    if (error) return c.json({ error: error.message }, 400);
    await audit(actor, 'Assigned administrator role', existing.id);
    return c.json(adminView(data.user));
  }
  if (typeof body.password !== 'string' || body.password.length < 12) return c.json({ error: 'Use a password with at least 12 characters.' }, 400);
  const { data, error } = await db.auth.admin.createUser({
    email, password: body.password, email_confirm: true,
    app_metadata: { role: body.role, admin_active: true }, user_metadata: { full_name: name, name },
  });
  if (error) return c.json({ error: error.message }, 400);
  await audit(actor, 'Created administrator account', data.user.id);
  return c.json(adminView(data.user), 201);
});

// Authenticated admin data API. Student-facing collections use the relational
// tables in schema.sql, so publishing in the admin app is immediately visible to
// the user app. Internal collections use the Supabase-backed KV store.
app.get("/make-server-f63d7d22/admin/:collection", async (c) => {
  const actor = await requireAdmin(c);
  const collection = c.req.param("collection");
  if (!actor) return c.json({ error: "Administrator authentication required" }, 401);
  if (!COLLECTIONS.has(collection)) return c.json({ error: "Unknown collection" }, 404);
  if (collection === "admin-users" && actor.role !== "super_admin") return c.json({ error: "Only super administrators can manage administrator records" }, 403);
  if (collection === 'admin-users') return c.json((await allAuthUsers()).filter(user => ADMIN_ROLES.includes(user.app_metadata?.role)).map(adminView));
  if (collection === 'student-activity') {
    const db = database();
    const [attempts, progress] = await Promise.all([
      db.from('practice_attempts').select('id,student_id,is_correct,submitted_at,questions(question)').order('submitted_at', { ascending: false }).limit(200),
      db.from('student_lesson_progress').select('student_id,lesson_id,completed_at,lessons(title)').not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(200),
    ]);
    if (attempts.error || progress.error) return c.json({ error: 'Unable to load learning activity' }, 500);
    return c.json([
      ...(attempts.data || []).map((item: any) => ({ id: item.id, student_id: item.student_id, title: item.questions?.question || 'Practice attempt', description: item.is_correct ? 'Correct answer' : 'Incorrect answer', type: 'practice_attempt', created_at: item.submitted_at })),
      ...(progress.data || []).map((item: any) => ({ id: `${item.student_id}-${item.lesson_id}`, student_id: item.student_id, title: item.lessons?.title || 'Lesson', description: 'Completed lesson', type: 'learning', created_at: item.completed_at })),
    ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 200));
  }
  if (TABLES[collection]) {
    const columns = collection === 'support-tickets' ? '*,student_profiles(full_name,email)' : collection === 'exams' ? '*,mock_exam_questions(question_id)' : '*';
    let query = database().from(TABLES[collection]).select(columns).order('created_at', { ascending: false });
    if (collection === 'mcq') query = query.eq('question_type', 'mcq');
    if (collection === 'essays') query = query.in('question_type', ['essay', 'problem']);
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    if (collection === 'support-tickets') return c.json((data || []).map((item: any) => ({ ...item, student_name: item.student_profiles?.full_name || 'Unknown student', student_email: item.student_profiles?.email || '', last_updated: item.updated_at })));
    if (collection === 'exams') return c.json((data || []).map((item: any) => ({ ...item, question_ids: (item.mock_exam_questions || []).map((link: any) => link.question_id) })));
    return c.json(data || []);
  }
  return c.json(await kv.get(`admin:${collection}`) || []);
});

app.put("/make-server-f63d7d22/admin/:collection/:id", async (c) => {
  const actor = await requireAdmin(c);
  const collection = c.req.param("collection");
  const id = c.req.param("id");
  if (!actor) return c.json({ error: "Administrator authentication required" }, 401);
  if (!COLLECTIONS.has(collection)) return c.json({ error: "Unknown collection" }, 404);
  if (collection === "admin-users" && actor.role !== "super_admin") return c.json({ error: "Only super administrators can manage administrator records" }, 403);
  if (collection === 'student-activity') return c.json({ error: 'Learning activity is recorded by students and cannot be edited here' }, 405);
  const payload = await c.req.json();
  if (collection === 'admin-users') {
    if (id === actor.id) return c.json({ error: 'You cannot change your own access.' }, 400);
    const db = database();
    const { data: current, error: lookupError } = await db.auth.admin.getUserById(id);
    if (lookupError || !current.user || !ADMIN_ROLES.includes(current.user.app_metadata?.role)) return c.json({ error: 'Administrator account not found' }, 404);
    if (!ADMIN_ROLES.includes(payload.role) || typeof payload.is_active !== 'boolean') return c.json({ error: 'Invalid role or active status' }, 400);
    const { data, error } = await db.auth.admin.updateUserById(id, {
      app_metadata: { ...current.user.app_metadata, role: payload.role, admin_active: payload.is_active },
    });
    if (error) return c.json({ error: error.message }, 400);
    await audit(actor, 'Updated administrator access', id);
    return c.json(adminView(data.user));
  }
  if (TABLES[collection]) {
    const record = databaseRecord(collection, payload, id);
    if (collection === 'courses' && typeof record.academic_level === 'string') {
      const level = Number(record.academic_level.replace(/\D/g, ''));
      const { data: academicLevel, error: levelError } = await database().from('academic_levels').select('id').eq('level', level < 100 ? level * 100 : level).maybeSingle();
      if (levelError) return c.json({ error: levelError.message }, 500);
      if (!academicLevel) return c.json({ error: 'Create this academic level before saving the course.' }, 400);
      record.academic_level_id = academicLevel.id;
    }
    if (collection === 'notifications' && record.status === 'sent' && !record.sent_at) record.sent_at = new Date().toISOString();
    if (collection === 'pages') { record.last_edited_at = new Date().toISOString(); }
    const { data, error } = collection === 'exams' && Array.isArray(payload.question_ids)
      ? await database().rpc('save_admin_exam', { exam_record: record, question_ids: payload.question_ids })
      : await database().from(TABLES[collection]).upsert(record).select().single();
    if (error) return c.json({ error: error.message }, 500);
    await audit(actor, `Saved ${collection}`, (data as any).title || (data as any).case_name || id);
    return c.json(data);
  }
  const items = await kv.get(`admin:${collection}`) || [];
  const now = new Date().toISOString();
  const record = { ...payload, id, updated_at: now, created_at: payload.created_at || now };
  const index = items.findIndex((item: any) => item.id === id);
  if (index >= 0) items[index] = { ...items[index], ...record }; else items.unshift(record);
  await kv.set(`admin:${collection}`, items);
  await audit(actor, index >= 0 ? `Updated ${collection}` : `Created ${collection}`, record.title || record.full_name || record.case_name || id);
  return c.json(record);
});

app.delete("/make-server-f63d7d22/admin/:collection/:id", async (c) => {
  const actor = await requireAdmin(c);
  const collection = c.req.param("collection");
  const id = c.req.param("id");
  if (!actor) return c.json({ error: "Administrator authentication required" }, 401);
  if (!COLLECTIONS.has(collection)) return c.json({ error: "Unknown collection" }, 404);
  if (collection === "admin-users" && actor.role !== "super_admin") return c.json({ error: "Only super administrators can manage administrator records" }, 403);
  if (collection === 'admin-users') return c.json({ error: 'Deactivate administrator accounts instead of deleting them.' }, 405);
  if (collection === 'student-activity') return c.json({ error: 'Learning activity cannot be deleted here' }, 405);
  if (TABLES[collection]) {
    const { error } = await database().from(TABLES[collection]).delete().eq('id', id);
    if (error) return c.json({ error: error.message }, 500);
    await audit(actor, `Deleted ${collection}`, id);
    return c.json({ ok: true });
  }
  const items = await kv.get(`admin:${collection}`) || [];
  await kv.set(`admin:${collection}`, items.filter((item: any) => item.id !== id));
  await audit(actor, `Deleted ${collection}`, id);
  return c.json({ ok: true });
});

// Server-only Paystack integration. Never accept a browser-supplied price or owner.
function paymentSecret() {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
  if (!/^sk_(test|live)_[a-zA-Z0-9]+$/.test(secret)) throw new Error('Payments are not configured. Please contact support.');
  return secret;
}
async function paystack(path: string, body?: unknown) {
  const response = await fetch(`https://api.paystack.co/transaction/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${paymentSecret()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error('Unable to confirm payment with Paystack. Please try again.');
  return result.data;
}
async function paymentUser(c: any) {
  const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await database().auth.getUser(token);
  return error ? null : data.user;
}
async function confirmPayment(reference: string) {
  const transaction = await paystack(`verify/${encodeURIComponent(reference)}`);
  if (transaction.reference !== reference) throw new Error('Payment reference mismatch');
  if (transaction.status !== 'success') return { status: transaction.status };
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) throw new Error('Invalid payment amount');
  const { error } = await database().rpc('fulfil_paystack_payment', {
    payment_reference: reference, paid_amount: transaction.amount, paid_currency: transaction.currency,
  });
  if (error) throw new Error('Payment could not be activated. Please retry verification or contact support with your reference.');
  return { status: 'success' };
}
app.post('/make-server-f63d7d22/payments/initialize', async c => {
  try {
    const user = await paymentUser(c);
    if (!user?.email) return c.json({ error: 'Please sign in before paying.' }, 401);
    paymentSecret();
    const site = new URL(Deno.env.get('STUDENT_SITE_URL') || '');
    if (site.protocol !== 'https:' && !(site.protocol === 'http:' && site.hostname === 'localhost')) throw new Error('Student site URL is not configured.');
    const { academic_level_id } = await c.req.json();
    const db = database();
    const { data: profile } = await db.from('student_profiles').select('is_active').eq('id', user.id).single();
    if (!profile?.is_active) return c.json({ error: 'Your account is inactive.' }, 403);
    const { data: level, error } = await db.from('academic_levels').select('id,name,price,duration_months').eq('id', academic_level_id).eq('status', 'published').single();
    if (error || !level) return c.json({ error: 'This package is unavailable.' }, 400);
    const amount = Math.round(Number(level.price) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) return c.json({ error: 'This package does not have a valid payment price.' }, 400);
    const reference = `sj-${crypto.randomUUID()}`;
    const { error: orderError } = await db.from('payment_orders').insert({ reference, student_id: user.id, academic_level_id: level.id, amount_kobo: amount, currency: 'NGN', duration_months: level.duration_months, plan: level.name });
    if (orderError) throw new Error('Unable to create payment order. Please contact support.');
    const transaction = await paystack('initialize', { email: user.email, amount, currency: 'NGN', reference, callback_url: new URL('/payment/success', site).href });
    return c.json({ authorization_url: transaction.authorization_url, reference });
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : 'Unable to start payment.' }, 503); }
});
app.post('/make-server-f63d7d22/payments/verify', async c => {
  try {
    const user = await paymentUser(c);
    if (!user) return c.json({ error: 'Please sign in to verify payment.' }, 401);
    const { reference } = await c.req.json();
    if (typeof reference !== 'string' || reference.length > 100) return c.json({ error: 'Invalid reference.' }, 400);
    const { data: order, error } = await database().from('payment_orders').select('reference').eq('reference', reference).eq('student_id', user.id).maybeSingle();
    if (error) throw new Error('Unable to load payment order.');
    if (!order) return c.json({ error: 'Payment order not found.' }, 404);
    return c.json(await confirmPayment(reference));
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : 'Unable to verify payment.' }, 503); }
});
app.post('/make-server-f63d7d22/paystack-webhook', async c => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('x-paystack-signature') || '';
    if (!/^[a-f0-9]{128}$/i.test(signature)) return c.json({ error: 'Invalid signature' }, 401);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(paymentSecret()), { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);
    const bytes = Uint8Array.from(signature.match(/../g)!, byte => parseInt(byte, 16));
    if (!await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(body))) return c.json({ error: 'Invalid signature' }, 401);
    const event = JSON.parse(body);
    if (event.event === 'charge.success') {
      const reference = event.data?.reference;
      if (typeof reference !== 'string') return c.json({ error: 'Invalid reference' }, 400);
      const { data: order, error } = await database().from('payment_orders').select('reference').eq('reference', reference).maybeSingle();
      if (error) throw error;
      // Other integrations on the same Paystack account are not our orders.
      if (order) await confirmPayment(reference);
    }
    return c.json({ received: true });
  } catch { return c.json({ error: 'Webhook processing failed; retry required.' }, 503); }
});

// Get payment status by reference (admin use only)
app.get("/make-server-f63d7d22/payment/:reference", async (c) => {
  const actor = await requireAdmin(c);
  if (!actor) return c.json({ error: "Administrator authentication required" }, 401);
  if (!['super_admin', 'admin'].includes(actor.role)) return c.json({ error: "Access denied" }, 403);
  const reference = c.req.param("reference");
  const { data, error } = await database().from('payments').select('*').eq('reference', reference).maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json(data);
});

Deno.serve(app.fetch);
