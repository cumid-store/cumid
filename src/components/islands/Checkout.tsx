import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { CONSENT_TEXT, TERMS_VERSION } from "../../config/commerce";
import ProductPrice from "./ProductPrice";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n / 100,
  );
declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, handler: (event: any) => void) => void;
    };
  }
}
async function loadGateway() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error("Payment window could not load. Please try again."));
    };
    document.head.appendChild(s);
  });
}
export default function Checkout() {
  const [catalogue, setCatalogue] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [productId, setProductId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [accepted, setAccepted] = useState(false),
    [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  useEffect(() => {
    api("checkout/catalogue")
      .then((c) => {
        setCatalogue(c);
        setProductId(
          new URLSearchParams(location.search).get("product") ||
            c.products.find((p: any) => p.available)?.id ||
            "",
        );
      })
      .catch(() => setCatalogue({ ready: false, products: [], settings: {} }));
    supabase?.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const id = new URLSearchParams(location.search).get("order");
    if (id) setOrderId(id);
  }, []);
  const p = catalogue?.products.find((p: any) => p.id === productId),
    total =
      (p?.price_paise || 0) * quantity +
      (catalogue?.settings.shipping_paise || 0);
  async function status(id = orderId) {
    try {
      const o = await api("checkout/status?id=" + encodeURIComponent(id));
      setMessage(
        o.payment_status === "paid"
          ? `Payment received. Order ${o.order_number} is confirmed.`
          : `Order ${o.order_number}: ${o.payment_status.replaceAll("_", " ")}. If your bank was debited, please wait for confirmation rather than paying again.`,
      );
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await loadGateway();
      let key = sessionStorage.getItem("cumid_checkout_key");
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem("cumid_checkout_key", key);
      }
      const order = await api("checkout/create", {
        key,
        productId,
        quantity,
        expectedTotal: total,
        accepted,
        termsVersion: TERMS_VERSION,
        customer: {
          name: data.get("name"),
          signedName: data.get("signedName"),
          phone: data.get("phone"),
          address: {
            street: data.get("street"),
            landmark: data.get("landmark"),
            city: data.get("city"),
            state: data.get("state"),
            pincode: data.get("pincode"),
          },
        },
      });
      setOrderId(order.orderId);
      history.replaceState(null, "", "/checkout?order=" + order.orderId);
      if (order.paid) {
        await status(order.orderId);
        setBusy(false);
        return;
      }
      const gateway = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.gatewayOrderId,
        name: "CUMID",
        description: order.orderNumber,
        prefill: { name: order.name, email: order.email, contact: order.phone },
        theme: { color: "#756284" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage(
              "Payment window closed. Check payment status before trying again if your bank was debited.",
            );
          },
        },
        handler: async (response: any) => {
          try {
            const result = await api("checkout/verify", {
              ...response,
              orderId: order.orderId,
            });
            setMessage(
              result.paid
                ? "Payment verified. Your diary order is confirmed."
                : "Payment is still being verified. Use Check payment status shortly.",
            );
            if (result.paid) sessionStorage.removeItem("cumid_checkout_key");
          } catch (e: any) {
            setError(
              e.message +
                " If debited, do not pay again; check order status or contact support.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      gateway.on("payment.failed", () => {
        setBusy(false);
        setError(
          "Payment was not completed. If debited, check payment status before retrying.",
        );
      });
      gateway.open();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="commerce-form">
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {orderId && (
        <div className="notice">
          <button type="button" onClick={() => status()}>
            Check payment status
          </button>{" "}
          · <a href="/account/orders">My orders</a>
          <p>Order reference: {orderId}</p>
        </div>
      )}
      {!catalogue && !error && <p>Loading checkout…</p>}
      {catalogue && !catalogue.ready && (
        <div className="notice">
          <h2>Online checkout is opening soon.</h2>
          <p>
            We are finalising payment setup and delivery details. You can still
            enquire about a diary.
          </p>
          <a className="btn-primary" href="https://wa.me/919201871597">
            Enquire on WhatsApp
          </a>
        </div>
      )}
      {catalogue?.ready && !signedIn && (
        <p className="notice">
          <a
            href={
              "/account?redirect=" +
              encodeURIComponent("/checkout?product=" + productId)
            }
          >
            Sign in with Google to place and track your order
          </a>
        </p>
      )}
      {catalogue?.ready && signedIn && (
        <form onSubmit={submit}>
          {catalogue.testMode && (
            <p role="status" className="notice">
              Test checkout — no real payment. Do not use real card details.
            </p>
          )}
          <label>
            Diary
            <select
              required
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setAccepted(false);
              }}
            >
              <option value="">Choose your diary</option>
              {catalogue.products
                .filter((p: any) => p.available)
                .map((p: any) => (
                  <option value={p.id} key={p.id}>
                    {p.name} — {money(p.price_paise)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Quantity
            <select
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                setAccepted(false);
              }}
            >
              {[1, 2, 3, 4, 5].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </label>
          {p && (
            <div className="notice">
              <strong>{p.name}</strong>
              <ProductPrice
                price={p.price_paise / 100}
                mrp={p.mrp_paise ? p.mrp_paise / 100 : undefined}
              />
              <p>{p.sale_description}</p>
              <p>Dispatch: {catalogue.settings.dispatch_note}</p>
              <p>
                Diaries: {money(p.price_paise * quantity)} · Shipping:{" "}
                {money(catalogue.settings.shipping_paise)}
              </p>
              <strong>
                Total payable: {money(total)} (inclusive of applicable taxes)
              </strong>
            </div>
          )}
          <h2>Delivery details</h2>
          <label>
            Full name
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
          <label>
            Mobile number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={14}
            />
          </label>
          <label>
            Street address
            <input
              name="street"
              autoComplete="street-address"
              required
              maxLength={250}
            />
          </label>
          <label>
            Landmark (optional)
            <input name="landmark" maxLength={150} />
          </label>
          <div className="form-grid">
            <label>
              City
              <input
                name="city"
                autoComplete="address-level2"
                required
                maxLength={80}
              />
            </label>
            <label>
              State
              <select name="state" autoComplete="address-level1" required>
                <option value="">Choose state</option>
                {catalogue.settings.allowed_states.map((s: string) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              PIN code
              <input
                name="pincode"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                maxLength={6}
                required
              />
            </label>
          </div>
          <fieldset>
            <legend>Review and accept</legend>
            <p>
              Minor colour and texture differences may occur between screen
              previews and the printed diary. Material differences, defects and
              incorrect goods remain covered by your consumer rights.
            </p>
            <p>
              <a href="/terms" target="_blank">
                Terms
              </a>{" "}
              ·{" "}
              <a href="/returns-cancellations" target="_blank">
                Returns & cancellations
              </a>{" "}
              ·{" "}
              <a href="/shipping" target="_blank">
                Shipping
              </a>{" "}
              ·{" "}
              <a href="/privacy" target="_blank">
                Privacy
              </a>
            </p>
            <label className="check">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>{CONSENT_TEXT}</span>
            </label>
            <label>
              Type your full name to accept
              <input
                name="signedName"
                required
                maxLength={100}
                autoComplete="off"
              />
            </label>
            <small>
              We record this acceptance, the policy version and the time with
              your order.
            </small>
          </fieldset>
          <p className="small">
            Sold by {catalogue.settings.seller_name},{" "}
            {catalogue.settings.seller_address}. Grievance contact:{" "}
            {catalogue.settings.grievance_name}, support@cumid.store.
          </p>
          <button
            className="btn-primary"
            disabled={busy || !accepted || !p?.available}
          >
            {busy ? "Opening secure payment…" : `Pay ${money(total)}`}
          </button>
          <p className="small">
            Payment is handled by Razorpay. Never share your UPI PIN or OTP with
            CUMID.
          </p>
        </form>
      )}
    </div>
  );
}
