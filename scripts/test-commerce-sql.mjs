import { PGlite } from "../artifacts/sql-test/node_modules/@electric-sql/pglite/dist/index.js";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb DEFAULT '{}');
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
`);
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
console.log(`${tests} database transaction and permission tests passed.`);
await db.close();
