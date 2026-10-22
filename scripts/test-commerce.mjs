import { build } from "esbuild";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs/promises";
await fs.mkdir("artifacts/tests", { recursive: true });
await build({
  entryPoints: ["src/lib/server/validation.ts"],
  outfile: "artifacts/tests/validation.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
await build({
  entryPoints: ["src/lib/server/commerce-api.ts"],
  outfile: "artifacts/tests/api.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const { verifyHmac, customer, links } =
  await import("../artifacts/tests/validation.mjs");
const { handleApi } = await import("../artifacts/tests/api.mjs");
await build({entryPoints:['src/lib/server/service-errors.ts'],outfile:'artifacts/tests/service-errors.mjs',bundle:true,platform:'node',format:'esm'});
const {rethrowSetupError}=await import('../artifacts/tests/service-errors.mjs');
let count = 0;
const test = async (name, fn) => {
  await fn();
  count++;
  console.log("PASS", name);
};
await test("Valid signature accepted; forged and changed payload rejected", async () => {
  const s = createHmac("sha256", "test-secret").update("payload").digest("hex");
  assert.equal(await verifyHmac("payload", s, "test-secret"), true);
  assert.equal(await verifyHmac("changed", s, "test-secret"), false);
  assert.equal(
    await verifyHmac("payload", "0".repeat(64), "test-secret"),
    false,
  );
  assert.equal(await verifyHmac("payload", null, "test-secret"), false);
});
await test('Missing tables and functions produce a specific setup failure',()=>{
 for(const code of ['PGRST205','PGRST202','42P01','42703'])assert.throws(()=>rethrowSetupError({code}),e=>e.code==='DATABASE_SETUP_REQUIRED'&&e.status===503);
 assert.throws(()=>rethrowSetupError({code:'42501'}),e=>e.status===403&&e.code==='ACCESS_DENIED');
 assert.throws(()=>rethrowSetupError({code:'PGRST116'}),e=>e.status===404);
});
await test('Public preorder catalogue works without payment secrets',async()=>{
 const response=await handleApi(new Request('https://cumid.store/api/checkout/catalogue'),{});
 assert.equal(response.status,200);
 const catalogue=await response.json();
 assert.equal(catalogue.ready,false);
 assert.equal(catalogue.mode,'whatsapp');
 assert.equal(catalogue.settings.shipping_paise,5000);
 assert.equal(catalogue.products.length,13);
 assert.ok(catalogue.products.every(p=>p.price_paise===14900 && !p.available && p.preorder_available));
});
const c = {
  name: "Test Buyer",
  signedName: "Test Buyer",
  phone: "9201871597",
  address: {
    street: "Test street",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462001",
  },
};
await test("Consent name and Indian address validated", () => {
  assert.equal(customer(c, "test@example.test").address.pincode, "462001");
  assert.throws(() =>
    customer({ ...c, signedName: "Someone Else" }, "a@b.test"),
  );
  assert.throws(() =>
    customer(
      { ...c, address: { ...c.address, pincode: "000000" } },
      "a@b.test",
    ),
  );
});
await test("Dangerous and excessive links rejected", () => {
  assert.throws(() => links(["javascript:alert(1)"]));
  assert.throws(() => links(["https://user:pass@example.com"]));
  assert.throws(() => links(Array(11).fill("https://example.com")));
  assert.equal(
    links(["https://drive.google.com/drive/folders/test"]).length,
    1,
  );
});
const env = {
  PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  PUBLIC_SITE_URL: "https://cumid.store",
  RAZORPAY_WEBHOOK_SECRET: "test-secret",
};
await test("Cross-origin mutation denied", async () => {
  assert.equal(
    (
      await handleApi(
        new Request("https://cumid.store/api/checkout/create", {
          method: "POST",
          headers: { origin: "https://attacker.test" },
          body: "{}",
        }),
        env,
      )
    ).status,
    403,
  );
});
await test("Missing authentication denied", async () => {
  assert.equal(
    (
      await handleApi(
        new Request("https://cumid.store/api/careers/applications"),
        env,
      )
    ).status,
    401,
  );
});
await test("Unconfigured services fail closed", async () => {
  assert.equal(
    (
      await handleApi(
        new Request("https://cumid.store/api/checkout/status"),
        {},
      )
    ).status,
    503,
  );
});
await test("Forged webhook cannot change orders", async () => {
  assert.equal(
    (
      await handleApi(
        new Request("https://cumid.store/api/payments/webhook", {
          method: "POST",
          headers: { "x-razorpay-signature": "0".repeat(64) },
          body: "{}",
        }),
        env,
      )
    ).status,
    401,
  );
});
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes("/auth/v1/user"))
    return new Response(
      JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111",
        email: "test@example.test",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  throw Error("Unexpected external request: " + url);
};
await test("No gateway keys means no payment initiation", async () => {
  const r = await handleApi(
    new Request("https://cumid.store/api/checkout/create", {
      method: "POST",
      headers: {
        origin: "https://cumid.store",
        authorization: "Bearer fake-test-token",
      },
      body: "{}",
    }),
    env,
  );
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /not open/);
});
await test("Live keys require explicit live switch", async () => {
  const r = await handleApi(
    new Request("https://cumid.store/api/checkout/create", {
      method: "POST",
      headers: {
        origin: "https://cumid.store",
        authorization: "Bearer fake-test-token",
      },
      body: "{}",
    }),
    { ...env, RAZORPAY_KEY_ID: "rzp_live_test", RAZORPAY_KEY_SECRET: "test" },
  );
  assert.equal(r.status, 503);
});
globalThis.fetch = nativeFetch;
console.log(`${count} commerce security tests passed.`);
