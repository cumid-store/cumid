import { PGlite } from "../artifacts/sql-test/node_modules/@electric-sql/pglite/dist/index.js";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const bootstrapSchema = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'service_role') $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb DEFAULT '{}');
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
`;
await db.exec(bootstrapSchema);
for (const f of (await fs.readdir("supabase/migrations")).sort())
  await db.exec(await fs.readFile("supabase/migrations/" + f, "utf8"));
const uid = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4)", [
  uid,
  "test@example.test",
  other,
  "other@example.test",
]);
let tests = 0;
const test = async (name, fn) => {
  await fn();
  tests++;
  console.log("PASS", name);
};
const c = {
  name: "Test Buyer",
  signedName: "Test Buyer",
  email: "test@example.test",
  phone: "9201871597",
  address: {
    fullName: "Test Buyer",
    phone: "9201871597",
    street: "Test",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462001",
  },
};
const start = (key, qty = 1, total = 10000) =>
  db.query(
    `SELECT public.begin_checkout($1,$2,'CUMID-FL-001',$3,$4,'test-version','test-consent',$5) AS result`,
    [uid, key, qty, c, total],
  );
await test("Checkout closed until seller configured", async () => {
  await assert.rejects(start(crypto.randomUUID()));
});
await db.exec(
  `UPDATE commerce_settings SET enabled=true,seller_name='Test seller',seller_address='Test address',grievance_name='Test contact',shipping_paise=0,dispatch_note='Test dispatch',allowed_states=ARRAY['Madhya Pradesh']; UPDATE products SET checkout_enabled=true,is_sold_out=false,price_paise=10000,sale_limit=2,sale_description='Test specifications' WHERE id='CUMID-FL-001';`,
);
await test("Tampered totals rejected without reserving stock", async () => {
  await assert.rejects(start(crypto.randomUUID(), 1, 1));
  assert.equal(
    (
      await db.query(
        "SELECT reserved_sales FROM products WHERE id='CUMID-FL-001'",
      )
    ).rows[0].reserved_sales,
    0,
  );
});
const key = crypto.randomUUID();
const first = (await start(key)).rows[0].result;
const oid = first.order.id;
await test("Duplicate checkout reuses one order and one reservation", async () => {
  const again = (await start(key)).rows[0].result;
  assert.equal(again.created, false);
  assert.equal(again.order.id, oid);
  assert.equal(
    (
      await db.query(
        "SELECT reserved_sales FROM products WHERE id='CUMID-FL-001'",
      )
    ).rows[0].reserved_sales,
    1,
  );
});
await test("Overselling blocked atomically", async () => {
  await assert.rejects(start(crypto.randomUUID(), 2, 20000));
});
await test("Payment mismatch rejected", async () => {
  await assert.rejects(
    db.query("SELECT confirm_gateway_payment($1,'order_test','pay_test',1,0)", [
      oid,
    ]),
  );
});
await test("Captured payment confirms once; duplicate does not add events", async () => {
  await db.query(
    "SELECT confirm_gateway_payment($1,'order_test','pay_test',10000,0)",
    [oid],
  );
  await db.query(
    "SELECT confirm_gateway_payment($1,'order_test','pay_test',10000,0)",
    [oid],
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM order_events WHERE order_id=$1 AND event_type='payment_paid'",
        [oid],
      )
    ).rows[0].n,
    1,
  );
});
await test("Refund status never regresses on late captured event", async () => {
  await db.query(
    "SELECT confirm_gateway_payment($1,'order_test','pay_test',10000,10000)",
    [oid],
  );
  await db.query(
    "SELECT confirm_gateway_payment($1,'order_test','pay_test',10000,0)",
    [oid],
  );
  assert.equal(
    (await db.query("SELECT payment_status FROM orders WHERE id=$1", [oid]))
      .rows[0].payment_status,
    "refunded",
  );
});
await test("Customer cannot grant themselves admin", async () => {
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${uid}';`);
  await assert.rejects(
    db.query("UPDATE profiles SET role='admin' WHERE id=$1", [uid]),
  );
  await db.exec("RESET ROLE");
});
const app = (
  await db.query(
    "INSERT INTO career_applications(user_id,name,email,role,introduction,privacy_version) VALUES($1,'Test','test@example.test','Design','Test','v1') RETURNING id",
    [uid],
  )
).rows[0].id;
await db.query(
  "UPDATE career_applications SET status='task_sent',task_opens_at=now()-interval '1 hour',task_deadline=now()+interval '1 hour' WHERE id=$1",
  [app],
);
const sub = (
  await db.query(
    "SELECT (create_career_submission($1,$2,'Test task','','[]')).id",
    [uid, app],
  )
).rows[0].id;
await test("Cannot submit or upload to another candidate application", async () => {
  await assert.rejects(
    db.query("SELECT create_career_submission($1,$2,'Attack','','[]')", [
      other,
      app,
    ]),
  );
  await assert.rejects(
    db.query("SELECT reserve_career_file($1,$2,'test.txt',10)", [other, sub]),
  );
});
await test("File size and aggregate quota enforced in database", async () => {
  await assert.rejects(
    db.query("SELECT reserve_career_file($1,$2,'large.bin',2097153)", [
      uid,
      sub,
    ]),
  );
  for (let i = 0; i < 3; i++)
    await db.query("SELECT reserve_career_file($1,$2,'test.bin',2097152)", [
      uid,
      sub,
    ]);
  await assert.rejects(
    db.query("SELECT reserve_career_file($1,$2,'extra.bin',1)", [uid, sub]),
  );
});
await test("Deadline closes new task submissions and file reservations", async () => {
  await db.query(
    "UPDATE career_applications SET task_deadline=now()-interval '1 second' WHERE id=$1",
    [app],
  );
  await assert.rejects(
    db.query("SELECT create_career_submission($1,$2,'Late','','[]')", [
      uid,
      app,
    ]),
  );
  await assert.rejects(
    db.query("SELECT reserve_career_file($1,$2,'late.txt',1)", [uid, sub]),
  );
});
await test("Scheduled task cannot be submitted before opening", async () => {
  await db.query(
    "UPDATE career_applications SET task_opens_at=now()+interval '1 hour',task_deadline=now()+interval '2 hours' WHERE id=$1",
    [app],
  );
  await assert.rejects(
    db.query("SELECT create_career_submission($1,$2,'Early','','[]')", [
      uid,
      app,
    ]),
  );
});
await db.exec(
  `SET ROLE authenticated; SET request.jwt.claim.role='authenticated'; SET request.jwt.claim.sub='${uid}';`,
);
let applied;
await test("Signed-in application saves and retry returns the same reference", async () => {
  const q =
    "SELECT apply_for_career('Candidate','Other','Introduction','[]','test') AS app";
  applied = (await db.query(q)).rows[0].app;
  const retry = (await db.query(q)).rows[0].app;
  assert.equal(applied.created, true);
  assert.equal(retry.created, false);
  assert.equal(applied.id, retry.id);
});
await test("Candidate can see saved applications with RLS", async () => {
  const rows = (
    await db.query("SELECT id FROM career_applications WHERE id=$1", [
      applied.id,
    ])
  ).rows;
  assert.equal(rows.length, 1);
});
await test("Candidate cannot open their own round or forge a different user", async () => {
  await assert.rejects(
    db.query(
      "SELECT manage_career_round($1,'task_sent',now(),now()+interval '1 day','Task',true)",
      [applied.id],
    ),
  );
  await assert.rejects(
    db.query("SELECT create_career_submission($1,$2,'Spoof','','[]')", [
      other,
      app,
    ]),
  );
});
await db.exec(`SET request.jwt.claim.sub='${other}';`);
await test("Other candidates cannot read an application or its history", async () => {
  assert.equal(
    (
      await db.query("SELECT id FROM career_applications WHERE id=$1", [
        applied.id,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "SELECT id FROM career_submissions WHERE application_id=$1",
        [app],
      )
    ).rows.length,
    0,
  );
});
await db.exec("RESET ROLE");
await test("Owner can assign an open round and close it again", async () => {
  await db.query("UPDATE profiles SET role='admin' WHERE id=$1", [other]);
  await db.exec("SET ROLE authenticated");
  await db.query(
    "SELECT manage_career_round($1,'task_sent',now()-interval '1 minute',now()+interval '1 hour','Draw a cover',true)",
    [applied.id],
  );
  assert.equal(
    (
      await db.query("SELECT status FROM career_applications WHERE id=$1", [
        applied.id,
      ])
    ).rows[0].status,
    "task_sent",
  );
  await db.query("SELECT manage_career_round($1,'closed')", [applied.id]);
  assert.equal(
    (
      await db.query("SELECT status FROM career_applications WHERE id=$1", [
        applied.id,
      ])
    ).rows[0].status,
    "closed",
  );
  await db.exec("RESET ROLE");
});
await test("Combined careers-only setup works with missing recruitment tables", async () => {
  const fresh = new PGlite();
  await fresh.exec(bootstrapSchema);
  for (const f of (await fs.readdir("supabase/migrations"))
    .sort()
    .filter((f) => f < "20261022000000"))
    await fresh.exec(await fs.readFile("supabase/migrations/" + f, "utf8"));
  await fresh.exec(await fs.readFile("supabase/CAREERS_SETUP.sql", "utf8"));
  assert.equal(
    (
      await fresh.query(
        "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='career_applications' AND column_name='task_deadline'",
      )
    ).rows[0].n,
    1,
  );
  await fresh.close();
});
await test('All diary prices become 149 without rewriting agreed order totals', async()=>{
 await db.exec(await fs.readFile('supabase/migrations/20261022020000_diary_pricing.sql','utf8'));
 assert.equal((await db.query('SELECT count(*)::int AS n FROM products WHERE price_paise<>14900 OR price_paise IS NULL')).rows[0].n,0);
 assert.equal(Number((await db.query('SELECT total_paise FROM orders WHERE id=$1',[oid])).rows[0].total_paise),10000);
});
await test('Full repair creates missing services and can be run twice',async()=>{
 const repair=new PGlite();await repair.exec(bootstrapSchema);
 const sql=await fs.readFile('supabase/REPAIR_MISSING_SETUP.sql','utf8');
 await repair.exec(sql);await repair.exec(sql);
 for(const table of ['profiles','products','commerce_settings','career_applications','orders'])assert.ok((await repair.query('SELECT to_regclass($1) AS name',['public.'+table])).rows[0].name);
 assert.equal((await repair.query('SELECT enabled FROM commerce_settings')).rows[0].enabled,false);
 assert.equal((await repair.query("SELECT has_column_privilege('authenticated','public.profiles','role','UPDATE') AS allowed")).rows[0].allowed,false);
 assert.equal((await repair.query("SELECT has_function_privilege('anon','public.handle_new_user()','EXECUTE') AS allowed")).rows[0].allowed,false);
 await repair.close();
});
await test('Full repair preserves an existing careers-only setup',async()=>{
 const repair=new PGlite();await repair.exec(bootstrapSchema);
 for(const f of (await fs.readdir('supabase/migrations')).sort().filter(f=>f<'20261022000000'))await repair.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
 await repair.exec(await fs.readFile('supabase/CAREERS_SETUP.sql','utf8'));
 await repair.exec(await fs.readFile('supabase/REPAIR_MISSING_SETUP.sql','utf8'));
 assert.equal((await repair.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='career_applications' AND column_name='task_deadline'")).rows[0].n,1);
 await repair.close();
});
console.log(`${tests} database transaction and permission tests passed.`);
await db.close();
