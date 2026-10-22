import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = "http://127.0.0.1:4335";
await fs.mkdir("artifacts/commerce-qa", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const denied = await page.request.get(base + "/api/checkout/catalogue");
assert.equal(denied.status(), 503);
const admin = await page.request.get(base + "/admin/careers", {
  maxRedirects: 0,
});
assert.equal(admin.status(), 302);
await page.goto(base + "/careers");
await page
  .getByRole("link", { name: "Sign in to apply", exact: true })
  .waitFor();
assert.equal(await page.locator("input[name=name]").count(), 0);
await page.screenshot({
  path: "artifacts/commerce-qa/careers-guest.png",
  fullPage: true,
});
const uid = "11111111-1111-4111-8111-111111111111",
  appId = "33333333-3333-4333-8333-333333333333";
const token =
  "eyJhbGciOiJIUzI1NiJ9." +
  Buffer.from(
    JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url") +
  ".test";
const session = {
  access_token: token,
  refresh_token: "test-refresh",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: uid,
    email: "test@example.test",
    app_metadata: {},
    user_metadata: {},
  },
};
await page
  .context()
  .addCookies([
    {
      name: "sb-jurjpvvgrqymawyttogv-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
await page.route("https://jurjpvvgrqymawyttogv.supabase.co/**", (r) =>
  r.fulfill({ json: session.user }),
);
let applications = [],
  uploaded = 0,
  createdOrder = null;
await page.route("**/api/careers/**", async (r) => {
  const req = r.request(),
    u = new URL(req.url());
  if (u.pathname.endsWith("/applications")) {
    if (req.method() === "POST") {
      const d = req.postDataJSON();
      assert.equal(d.consent, true);
      applications = [
        {
          id: appId,
          ...d,
          status: "received",
          created_at: new Date().toISOString(),
          career_submissions: [],
        },
      ];
      return r.fulfill({ json: applications[0] });
    }
    return r.fulfill({ json: applications });
  }
  if (u.pathname.endsWith("/submissions")) {
    const d = req.postDataJSON();
    assert.equal(d.applicationId, appId);
    return r.fulfill({ json: { id: "44444444-4444-4444-8444-444444444444" } });
  }
  if (u.pathname.endsWith("/upload")) {
    uploaded++;
    return r.fulfill({ json: { id: crypto.randomUUID() } });
  }
  return r.abort();
});
await page.goto(base + "/careers");
await page.locator("input[name=name]").fill("Test Candidate");
await page.locator("select[name=role]").selectOption("Design & illustration");
await page
  .locator("textarea[name=introduction]")
  .fill("I enjoy drawing and would like to help design diary covers.");
await page.locator("input[name=consent]").check();
await page
  .getByRole("button", { name: "Send application", exact: true })
  .click();
await page
  .getByRole("status")
  .filter({ hasText: "Application received" })
  .waitFor();
await page.goto(base + "/careers/tasks");
await page.locator("input[name=title]").fill("Cover artwork");
await page
  .locator("textarea[name=links]")
  .fill("https://drive.google.com/drive/folders/test");
await page.locator("input[name=files]").setInputFiles([
  {
    name: "artwork.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  },
  {
    name: "source.custom",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("test"),
  },
]);
await page.getByRole("button", { name: "Submit task", exact: true }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Your task has been submitted" })
  .waitFor();
assert.equal(uploaded, 2);
const catalogue = {
  ready: true,
  testMode: true,
  settings: {
    seller_name: "Test proprietor",
    seller_address: "Test address",
    grievance_name: "Test owner",
    shipping_paise: 5000,
    dispatch_note: "Test dispatch estimate",
    allowed_states: ["Madhya Pradesh"],
  },
  products: [
    {
      id: "CUMID-FL-001",
      name: "Lavender Bloom",
      price_paise: 19900,
      available: true,
      sale_description: "Test diary specifications",
    },
  ],
};
await page.route("**/api/checkout/**", (r) => {
  const u = new URL(r.request().url());
  if (u.pathname.endsWith("/catalogue")) return r.fulfill({ json: catalogue });
  if (u.pathname.endsWith("/create")) {
    createdOrder = r.request().postDataJSON();
    return r.fulfill({
      json: {
        orderId: appId,
        orderNumber: "CMD-TEST",
        keyId: "rzp_test_fake",
        gatewayOrderId: "order_test",
        amount: 24900,
        currency: "INR",
        name: "Test Buyer",
        email: "test@example.test",
        phone: "9201871597",
      },
    });
  }
  if (u.pathname.endsWith("/verify"))
    return r.fulfill({ json: { paid: true, orderId: appId } });
  return r.fulfill({
    json: { payment_status: "paid", order_number: "CMD-TEST" },
  });
});
await page.route("https://checkout.razorpay.com/v1/checkout.js", (r) =>
  r.fulfill({
    contentType: "application/javascript",
    body: 'window.Razorpay=class {constructor(o){this.o=o}on(){}open(){this.o.handler({razorpay_order_id:"order_test",razorpay_payment_id:"pay_test",razorpay_signature:"test"})}}',
  }),
);
await page.goto(base + "/checkout?product=CUMID-FL-001");
await page.getByRole("button", { name: "Pay ₹249.00", exact: true }).waitFor();
assert.equal(
  await page
    .getByRole("button", { name: "Pay ₹249.00", exact: true })
    .isDisabled(),
  true,
);
for (const [name, value] of Object.entries({
  name: "Test Buyer",
  phone: "9201871597",
  street: "Test street",
  city: "Bhopal",
  pincode: "462001",
  signedName: "Test Buyer",
}))
  await page.locator(`input[name=${name}]`).fill(value);
await page.locator("select[name=state]").selectOption("Madhya Pradesh");
await page.locator("fieldset input[type=checkbox]").check();
await page.screenshot({
  path: "artifacts/commerce-qa/checkout-desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Pay ₹249.00", exact: true }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Payment verified" })
  .waitFor();
assert.equal(createdOrder.expectedTotal, 24900);
assert.equal(createdOrder.accepted, true);
assert.equal(createdOrder.customer.signedName, "Test Buyer");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/careers/tasks");
await page.getByRole("button", { name: "Submit task", exact: true }).waitFor();
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page.screenshot({
  path: "artifacts/commerce-qa/tasks-mobile.png",
  fullPage: true,
});
assert.deepEqual(errors, []);
console.log(
  "PASS Worker fails closed, private admin redirect, guest sign-in, application submission, arbitrary multi-file upload, checkout consent gating, mocked payment confirmation, mobile overflow, no page errors.",
);
await browser.close();
