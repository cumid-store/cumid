import { createClient } from "@supabase/supabase-js";
import { DIARY_PRICING } from "../../config/pricing";
import { PREORDER } from '../../config/preorder';
import { PRODUCTS } from '../../data/products';
import { rethrowSetupError } from "./service-errors";
import {
  TERMS_VERSION,
  CONSENT_TEXT,
  CAREER_ROLES,
  MAX_FILE_BYTES,
} from "../../config/commerce";
import {
  RequestError,
  text,
  uuid,
  links,
  customer,
  verifyHmac,
} from "./validation";
type Env = Record<string, string | undefined>;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
function check(result: any) {
  rethrowSetupError(result.error);
  if (result.error) throw new Error("Database operation failed");
  return result.data;
}
async function body(request: Request, max = 16000) {
  const raw = await bounded(request, max);
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new RequestError("Invalid JSON body.");
  }
}
async function bounded(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new RequestError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Request body missing.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    size += r.value.length;
    if (size > max) {
      await reader.cancel();
      throw new RequestError("Request is too large.", 413);
    }
    chunks.push(r.value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
function database(env: Env) {
  if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new RequestError(
      "This service is being prepared. Please contact support@cumid.store.",
      503,
    );
  return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function candidateDatabase(env: Env, request: Request) {
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY)
    throw new RequestError(
      "Applications are temporarily unavailable. Please try again later.",
      503,
    );
  return createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: request.headers.get("authorization") || "" },
    },
  });
}
async function gateway(env: Env, path: string, payload?: unknown) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)
    throw new RequestError("Payments are not open yet.", 503);
  const response = await fetch("https://api.razorpay.com/v1/" + path, {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization:
        "Basic " + btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET),
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new RequestError(
      "The payment provider could not complete this request. Please contact support with your order reference before retrying.",
      502,
    );
  return response.json() as Promise<any>;
}
async function reconcile(
  db: any,
  env: Env,
  paymentId: string,
  expectedOrder?: any,
) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId))
    throw new RequestError("Invalid payment reference.");
  const payment = await gateway(env, "payments/" + paymentId);
  const providerOrder = await gateway(env, "orders/" + payment.order_id);
  const localId = uuid(providerOrder.notes?.cumid_order_id);
  const order =
    expectedOrder ||
    check(await db.from("orders").select("*").eq("id", localId).single());
  if (
    order.id !== localId ||
    providerOrder.receipt !== order.order_number ||
    payment.order_id !== providerOrder.id ||
    payment.amount !== Number(order.total_paise) ||
    providerOrder.amount !== Number(order.total_paise) ||
    payment.currency !== "INR" ||
    providerOrder.currency !== "INR" ||
    (order.gateway_order_id && order.gateway_order_id !== payment.order_id)
  )
    throw new RequestError("Payment details do not match this order.", 409);
  if (payment.status !== "captured" && payment.status !== "refunded")
    return { paid: false, orderId: order.id };
  check(
    await db.rpc("confirm_gateway_payment", {
      p_order: order.id,
      p_gateway_order: payment.order_id,
      p_payment: payment.id,
      p_amount: payment.amount,
      p_refunded: payment.amount_refunded || 0,
    }),
  );
  return { paid: true, orderId: order.id };
}
export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url),
      route = url.pathname.replace(/^\/api\//, "");
    if (request.method === "POST" && route !== "payments/webhook") {
      const origin = request.headers.get("origin");
      const allowed = new URL(env.PUBLIC_SITE_URL || url.origin).origin;
      if (!origin || (origin !== allowed && origin !== url.origin))
        throw new RequestError("Request origin is not allowed.", 403);
    }
    const candidateRoute = [
      "careers/applications",
      "careers/submissions",
      "admin/careers",
    ].includes(route);
    // Public browsing and WhatsApp preorders work without privileged database
    // credentials. This response never authorises a payment or creates an order.
    if (route === 'checkout/catalogue' && request.method === 'GET' &&
        (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RAZORPAY_KEY_ID ||
         !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET)) {
      return json({
        ready: false, mode: 'whatsapp', preordersOpen: true,
        settings: { shipping_paise: PREORDER.shippingPaise, delivery_note: PREORDER.deliveryText },
        products: PRODUCTS.filter(p => !p.isSoldOut).map(p => ({
          id: p.id, name: p.name, slug: p.slug,
          price_paise: DIARY_PRICING.salePaise, mrp_paise: DIARY_PRICING.mrpPaise,
          preorder_available: true, available: false,
        })),
      });
    }
    const db = candidateRoute ? candidateDatabase(env, request) : database(env);
    if (route === "payments/webhook" && request.method === "POST") {
      const raw = new TextDecoder().decode(await bounded(request, 128000));
      if (
        !(await verifyHmac(
          raw,
          request.headers.get("x-razorpay-signature"),
          env.RAZORPAY_WEBHOOK_SECRET || "",
        ))
      )
        throw new RequestError("Invalid webhook signature.", 401);
      let event: any;
      try {
        event = JSON.parse(raw);
      } catch {
        throw new RequestError("Invalid event.");
      }
      if (
        ["payment.captured", "order.paid", "refund.processed"].includes(
          event.event,
        )
      ) {
        const paymentId =
          event.payload?.payment?.entity?.id ||
          event.payload?.refund?.entity?.payment_id;
        if (!paymentId) throw new RequestError("Missing payment.", 400);
        await reconcile(db, env, paymentId);
      }
      return json({ received: true });
    }
    if (route === "checkout/catalogue" && request.method === "GET") {
      const settings = check(
        await db.from("commerce_settings").select("*").eq("id", true).single(),
      );
      const products = check(
        await db
          .from("products")
          .select(
            "id,slug,name,price_paise,checkout_enabled,is_sold_out,sale_limit,reserved_sales,sale_description",
          )
          .eq("is_published", true),
      );
      const ready = Boolean(
        settings.enabled &&
        settings.seller_name &&
        settings.seller_address &&
        settings.grievance_name &&
        settings.shipping_paise !== null &&
        settings.dispatch_note &&
        settings.allowed_states.length &&
        env.RAZORPAY_KEY_ID &&
        env.RAZORPAY_KEY_SECRET &&
        env.RAZORPAY_WEBHOOK_SECRET &&
        (env.RAZORPAY_KEY_ID.startsWith("rzp_test_") ||
          env.PAYMENTS_LIVE_ENABLED === "true"),
      );
      return json({
        ready,
        testMode: env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") || false,
        settings,
        termsVersion: TERMS_VERSION,
        products: products.map((p: any) => ({
          ...p,
          mrp_paise: DIARY_PRICING.mrpPaise,
          available:
            p.checkout_enabled &&
            !p.is_sold_out &&
            p.price_paise > 0 &&
            p.sale_description &&
            p.sale_limit > p.reserved_sales,
        })),
      });
    }
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new RequestError("Please sign in to continue.", 401);
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user?.email)
      throw new RequestError(
        "Your session has expired. Please sign in again.",
        401,
      );
    const user = auth.user;
    if (route === "checkout/create" && request.method === "POST") {
      if (
        !env.RAZORPAY_KEY_ID ||
        !env.RAZORPAY_KEY_SECRET ||
        !env.RAZORPAY_WEBHOOK_SECRET ||
        (!env.RAZORPAY_KEY_ID.startsWith("rzp_test_") &&
          env.PAYMENTS_LIVE_ENABLED !== "true")
      )
        throw new RequestError("Payments are not open yet.", 503);
      const input = await body(request);
      if (input.accepted !== true || input.termsVersion !== TERMS_VERSION)
        throw new RequestError("Read and accept the current checkout terms.");
      const c = customer(input.customer, user.email!);
      const key = uuid(input.key);
      const product = text(input.productId, "product", 80);
      if (
        !Number.isInteger(input.quantity) ||
        input.quantity < 1 ||
        input.quantity > 5
      )
        throw new RequestError("Choose 1–5 diaries.");
      if (
        !Number.isSafeInteger(input.expectedTotal) ||
        input.expectedTotal <= 0
      )
        throw new RequestError("Review the current order total.");
      const result = await db.rpc("begin_checkout", {
        p_user: user.id,
        p_key: key,
        p_product: product,
        p_qty: input.quantity,
        p_customer: c,
        p_terms: TERMS_VERSION,
        p_consent: CONSENT_TEXT,
        p_expected_total: input.expectedTotal,
      });
      rethrowSetupError(result.error);
      if (result.error)
        throw new RequestError(
          "Checkout could not start. Check availability and delivery state, or contact support if you have already tried several times.",
          409,
        );
      const { order, created } = result.data;
      if (order.payment_status === "paid")
        return json({ paid: true, orderId: order.id });
      if (!created && !order.gateway_order_id)
        throw new RequestError(
          "This checkout is awaiting reconciliation. Contact support with " +
            order.order_number +
            " before starting another payment.",
          409,
        );
      let providerId = order.gateway_order_id;
      if (created) {
        const provider = await gateway(env, "orders", {
          amount: Number(order.total_paise),
          currency: "INR",
          receipt: order.order_number,
          notes: { cumid_order_id: order.id },
        });
        providerId = provider.id;
        check(
          await db
            .from("orders")
            .update({ gateway_order_id: providerId })
            .eq("id", order.id),
        );
      }
      return json({
        orderId: order.id,
        orderNumber: order.order_number,
        keyId: env.RAZORPAY_KEY_ID,
        gatewayOrderId: providerId,
        amount: Number(order.total_paise),
        currency: "INR",
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      });
    }
    if (route === "checkout/verify" && request.method === "POST") {
      const input = await body(request);
      const order = check(
        await db
          .from("orders")
          .select("*")
          .eq("id", uuid(input.orderId))
          .eq("user_id", user.id)
          .single(),
      );
      const pid = text(input.razorpay_payment_id, "payment ID", 100);
      if (
        input.razorpay_order_id !== order.gateway_order_id ||
        !(await verifyHmac(
          order.gateway_order_id + "|" + pid,
          input.razorpay_signature,
          env.RAZORPAY_KEY_SECRET || "",
        ))
      )
        throw new RequestError("Payment verification failed.", 400);
      return json(await reconcile(db, env, pid, order));
    }
    if (route === "checkout/status" && request.method === "GET") {
      const order = check(
        await db
          .from("orders")
          .select("id,order_number,payment_status,total_paise,status")
          .eq("id", uuid(url.searchParams.get("id")))
          .eq("user_id", user.id)
          .single(),
      );
      return json(order);
    }
    if (route === "orders/cancellation" && request.method === "POST") {
      const input = await body(request);
      const result = await db.rpc("request_customer_cancellation", {
        p_user: user.id,
        p_order: uuid(input.orderId),
        p_reason: text(input.reason, "cancellation reason", 1000),
      });
      rethrowSetupError(result.error);
      if (result.error)
        throw new RequestError(
          "Unable to record this request. Contact support with your order reference.",
          409,
        );
      return json({ success: true });
    }
    if (route === "careers/applications" && request.method === "GET") {
      return json({
        serverNow: new Date().toISOString(),
        uploadsEnabled: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
        applications: check(
          await db
            .from("career_applications")
            .select(
              "id,name,role,status,created_at,task_opens_at,task_deadline,task_brief,career_submissions(id,title,notes,links,created_at,career_files(id,name,size,state))",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ),
      });
    }
    if (route === "careers/applications" && request.method === "POST") {
      const input = await body(request);
      if (!CAREER_ROLES.includes(input.role) || input.consent !== true)
        throw new RequestError(
          "Choose a role and accept the recruitment privacy notice.",
        );
      const result = await db.rpc("apply_for_career", {
        p_name: text(input.name, "name"),
        p_role: input.role,
        p_introduction: text(input.introduction, "introduction", 2000),
        p_links: links(input.links),
        p_version: TERMS_VERSION,
      });
      rethrowSetupError(result.error);
      if (result.error)
        throw new RequestError(
          "We could not confirm your application. Your entries are still here. Check My applications before retrying, or contact support@cumid.store.",
          503,
        );
      return json(check(result), result.data.created ? 201 : 200);
    }
    if (route === "careers/submissions" && request.method === "POST") {
      const input = await body(request);
      const appId = uuid(input.applicationId);
      check(
        await db
          .from("career_applications")
          .select("id")
          .eq("id", appId)
          .eq("user_id", user.id)
          .single(),
      );
      const result = await db.rpc("create_career_submission", {
        p_user: user.id,
        p_application: appId,
        p_title: text(input.title, "task title", 160),
        p_notes: text(input.notes || "", "notes", 2000, 0),
        p_links: links(input.links),
      });
      rethrowSetupError(result.error);
      if (result.error)
        throw new RequestError(
          "Task submission is unavailable. Check your round opening time and deadline, and the limit of 10 submissions per application.",
          409,
        );
      return json(result.data, 201);
    }
    if (route === "careers/upload" && request.method === "POST") {
      const submission = uuid(url.searchParams.get("submission"));
      const filename = text(
        request.headers.get("x-file-name")
          ? decodeURIComponent(request.headers.get("x-file-name")!)
          : "file",
        "file name",
        180,
      ).replace(/[\\/\r\n]/g, "_");
      const bytes = await bounded(request, MAX_FILE_BYTES);
      if (!bytes.length)
        throw new RequestError("Empty files cannot be uploaded.");
      const reserved = await db.rpc("reserve_career_file", {
        p_user: user.id,
        p_submission: submission,
        p_name: filename,
        p_size: bytes.length,
      });
      rethrowSetupError(reserved.error);
      if (reserved.error)
        throw new RequestError(
          "Upload allowance reached or submission unavailable. Add a Drive folder/file link instead.",
          409,
        );
      const file = reserved.data;
      const upload = await db.storage
        .from("career-files")
        .upload(file.path, bytes, {
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (upload.error) {
        await db.storage.from("career-files").remove([file.path]);
        await db.from("career_files").delete().eq("id", file.id);
        throw new RequestError(
          "File upload failed. Your task is saved; submit a Drive link through the portal instead.",
          503,
        );
      }
      check(
        await db
          .from("career_files")
          .update({ state: "uploaded" })
          .eq("id", file.id),
      );
      return json({ id: file.id, name: file.name }, 201);
    }
    if (route.startsWith("admin/")) {
      const profile = check(
        await db.from("profiles").select("role").eq("id", user.id).single(),
      );
      if (profile.role !== "admin")
        throw new RequestError("Administrator access required.", 403);
      if (route === "admin/careers" && request.method === "GET") {
        const page = Math.max(
          0,
          Math.min(1000, Number(url.searchParams.get("page")) || 0),
        );
        return json(
          check(
            await db
              .from("career_applications")
              .select(
                "*,career_submissions(*,career_files(id,name,size,state))",
              )
              .order("created_at", { ascending: false })
              .range(page * 20, page * 20 + 19),
          ),
        );
      }
      if (route === "admin/commerce" && request.method === "GET")
        return json({
          settings: check(
            await db
              .from("commerce_settings")
              .select("*")
              .eq("id", true)
              .single(),
          ),
          products: check(
            await db
              .from("products")
              .select(
                "id,name,price_paise,checkout_enabled,is_sold_out,sale_limit,reserved_sales,sale_description",
              )
              .eq("is_published", true)
              .order("name"),
          ),
        });
      if (route === "admin/commerce" && request.method === "POST") {
        const input = await body(request);
        if (input.product) {
          const p = input.product;
          if (
            !Number.isSafeInteger(p.price_paise) ||
            p.price_paise <= 0 ||
            p.price_paise > 2000000 ||
            !Number.isInteger(p.sale_limit) ||
            p.sale_limit < 0 ||
            p.sale_limit > 100000
          )
            throw new RequestError("Enter a valid price and batch limit.");
          check(
            await db
              .from("products")
              .update({
                price_paise: p.price_paise,
                sale_limit: p.sale_limit,
                sale_description: text(
                  p.sale_description,
                  "confirmed specifications",
                  2000,
                ),
                checkout_enabled: p.checkout_enabled === true,
                is_sold_out: p.checkout_enabled !== true,
              })
              .eq("id", text(p.id, "product ID", 80)),
          );
        } else {
          const s = input.settings;
          if (
            !s ||
            !Number.isSafeInteger(s.shipping_paise) ||
            s.shipping_paise < 0 ||
            s.shipping_paise > 100000 ||
            !Array.isArray(s.allowed_states) ||
            !s.allowed_states.length ||
            s.allowed_states.length > 36
          )
            throw new RequestError(
              "Enter shipping charges and at least one delivery state.",
            );
          check(
            await db
              .from("commerce_settings")
              .update({
                enabled: s.enabled === true,
                seller_name: text(s.seller_name, "legal seller name", 150),
                seller_address: text(s.seller_address, "seller address", 500),
                grievance_name: text(
                  s.grievance_name,
                  "grievance contact",
                  100,
                ),
                dispatch_note: text(s.dispatch_note, "dispatch estimate", 500),
                shipping_paise: s.shipping_paise,
                allowed_states: s.allowed_states.map((v: unknown) =>
                  text(v, "state", 80),
                ),
              })
              .eq("id", true),
          );
        }
        return json({ saved: true });
      }
      if (route === "admin/careers" && request.method === "POST") {
        const input = await body(request);
        if (
          ![
            "received",
            "reviewing",
            "task_sent",
            "shortlisted",
            "closed",
          ].includes(input.status)
        )
          throw new RequestError("Invalid status.");
        const window = input.round;
        if (
          window &&
          (!Number.isFinite(Date.parse(window.opensAt)) ||
            !Number.isFinite(Date.parse(window.deadline)) ||
            Date.parse(window.deadline) <= Date.parse(window.opensAt) ||
            Date.parse(window.deadline) <= Date.now())
        )
          throw new RequestError(
            "Choose a valid opening time and a future deadline.",
          );
        const result = await db.rpc("manage_career_round", {
          p_application: uuid(input.id),
          p_status: input.status,
          p_open: window?.opensAt || null,
          p_deadline: window?.deadline || null,
          p_brief: window ? text(window.brief, "task brief", 4000) : null,
          p_update_window: Boolean(window),
        });
        rethrowSetupError(result.error);
        if (result.error)
          throw new RequestError(
            "Could not save this round. Check the dates, task brief and your administrator access.",
            409,
          );
        return json({ saved: true });
      }
      if (route === "admin/file" && request.method === "GET") {
        const file = check(
          await db
            .from("career_files")
            .select("*")
            .eq("id", uuid(url.searchParams.get("id")))
            .eq("state", "uploaded")
            .single(),
        );
        const download = await db.storage
          .from("career-files")
          .download(file.path);
        check(download);
        return new Response(download.data, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="submission.bin"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "Cache-Control": "private, no-store",
          },
        });
      }
    }
    throw new RequestError("Not found.", 404);
  } catch (error) {
    if (error instanceof RequestError)
      return json({ error: error.message, code: error.code }, error.status);
    const reference = crypto.randomUUID();
    console.error(
      "CUMID API request failed:",
      error instanceof Error ? error.name : "UnknownError",
      reference,
    );
    return json(
      {
        error:
          "We could not confirm this request. Check your saved applications or orders before retrying. Contact support@cumid.store with reference " +
          reference +
          ".",
        code: "REQUEST_UNCONFIRMED",
        reference,
      },
      503,
    );
  }
}
