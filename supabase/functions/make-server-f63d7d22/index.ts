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
  if (error || !data.user) return null;
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
  return c.json({ status: "ok" });
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

// Paystack webhook handler — verifies HMAC signature and updates subscription status
app.post("/make-server-f63d7d22/paystack-webhook", async (c) => {
  const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET) {
    return c.json({ error: "Webhook not configured" }, 500);
  }

  const body = await c.req.text();
  const signature = c.req.header("x-paystack-signature");

  // Verify HMAC-SHA512 signature
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(PAYSTACK_SECRET),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (hex !== signature) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference, customer, amount, metadata } = event.data;
    const studentId = metadata?.student_id;
    const academicLevelId = metadata?.academic_level_id;
    if (!studentId || !academicLevelId) return c.json({ error: "Payment metadata is incomplete" }, 400);
    const db = database();
    const { data: existingPayment, error: existingPaymentError } = await db.from('payments').select('id').eq('reference', reference).maybeSingle();
    if (existingPaymentError) return c.json({ error: existingPaymentError.message }, 500);
    if (existingPayment) return c.json({ received: true });
    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    const { data: level, error: levelError } = await db.from('academic_levels').select('duration_months').eq('id', academicLevelId).single();
    if (levelError) return c.json({ error: levelError.message }, 500);
    expiresAt.setMonth(expiresAt.getMonth() + level.duration_months);
    const { data: subscription, error: subscriptionError } = await db.from('subscriptions').insert({
      student_id: studentId, academic_level_id: academicLevelId, plan: metadata?.plan || 'Academic level subscription',
      status: 'active', starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString(),
    }).select('id').single();
    if (subscriptionError) return c.json({ error: subscriptionError.message }, 500);
    const { error: paymentError } = await db.from('payments').upsert({
      student_id: studentId, subscription_id: subscription.id, reference, amount: Number(amount) / 100,
      currency: event.data.currency || 'NGN', plan: metadata?.plan, status: 'success', paid_at: event.data.paid_at || new Date().toISOString(), provider_payload: event.data,
    }, { onConflict: 'reference' });
    if (paymentError) return c.json({ error: paymentError.message }, 500);
    const { error: profileError } = await db.from('student_profiles').update({ subscription_status: 'active' }).eq('id', studentId);
    if (profileError) return c.json({ error: profileError.message }, 500);
  }

  return c.json({ received: true });
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
