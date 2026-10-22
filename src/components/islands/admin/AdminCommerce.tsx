import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import AdminLayout from "./AdminLayout";
export default function AdminCommerce() {
  const [data, setData] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api("admin/commerce"));
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(payload: any) {
    setBusy(true);
    try {
      await api("admin/commerce", payload);
      setMessage(
        "Saved. Gateway secrets and the live-payment switch are still required on the server.",
      );
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout
      activeTab="commerce"
      title="Checkout setup"
      subtitle="Confirm real selling details before enabling orders"
    >
      <div className="commerce-form">
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {data && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save({
                  settings: {
                    enabled: f.get("enabled") === "on",
                    seller_name: f.get("seller_name"),
                    seller_address: f.get("seller_address"),
                    grievance_name: f.get("grievance_name"),
                    dispatch_note: f.get("dispatch_note"),
                    shipping_paise: Math.round(Number(f.get("shipping")) * 100),
                    allowed_states: String(f.get("states"))
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                });
              }}
              key={JSON.stringify(data.settings)}
            >
              <h2>Seller & delivery details</h2>
              {[
                ["seller_name", "Legal seller / proprietor name"],
                ["seller_address", "Public business address"],
                ["grievance_name", "Grievance contact name"],
                ["dispatch_note", "Dispatch estimate shown to buyers"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    required
                    defaultValue={data.settings[key]}
                  />
                </label>
              ))}
              <label>
                Shipping charge (₹)
                <input
                  name="shipping"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  required
                  defaultValue={
                    data.settings.shipping_paise === null
                      ? ""
                      : data.settings.shipping_paise / 100
                  }
                />
              </label>
              <label>
                Delivery states (comma separated)
                <input
                  name="states"
                  required
                  defaultValue={data.settings.allowed_states.join(", ")}
                  placeholder="e.g. Madhya Pradesh"
                />
              </label>
              <label className="check">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={data.settings.enabled}
                />
                <span>
                  Enable checkout after confirming seller, tax, product and
                  delivery details. Live mode additionally requires
                  PAYMENTS_LIVE_ENABLED on the server.
                </span>
              </label>
              <button className="btn-primary" disabled={busy}>
                Save checkout settings
              </button>
            </form>
            <h2 className="mt-10">Products & batch limits</h2>
            <p className="small">
              Prices include applicable taxes. Sale limit includes all
              reservations, including unpaid checkouts. Do not release a
              reservation until the gateway confirms it cannot later be paid.
              Refunds do not automatically restock items.
            </p>
            {data.products.map((p: any) => (
              <article key={p.id}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void save({
                      product: {
                        id: p.id,
                        price_paise: Math.round(Number(f.get("price")) * 100),
                        sale_limit: Number(f.get("limit")),
                        sale_description: f.get("description"),
                        checkout_enabled: f.get("enabled") === "on",
                      },
                    });
                  }}
                >
                  <h2>{p.name}</h2>
                  <p>
                    {p.reserved_sales} slots reserved / {p.sale_limit} total
                  </p>
                  <label>
                    Price per diary (₹)
                    <input
                      name="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      defaultValue={
                        p.price_paise === null ? "" : p.price_paise / 100
                      }
                    />
                  </label>
                  <label>
                    Total batch allocation
                    <input
                      name="limit"
                      type="number"
                      min={p.reserved_sales}
                      max="100000"
                      step="1"
                      defaultValue={p.sale_limit}
                      required
                    />
                  </label>
                  <label>
                    Confirmed product specifications
                    <textarea
                      name="description"
                      required
                      maxLength={2000}
                      defaultValue={p.sale_description}
                      placeholder="Exact size, sheet/page count, paper GSM, cover finish, top spiral and whether this is a preorder."
                    />
                  </label>
                  <label className="check">
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={p.checkout_enabled}
                    />
                    <span>Open this diary for ordering</span>
                  </label>
                  <button className="btn-primary" disabled={busy}>
                    Save {p.name}
                  </button>
                </form>
              </article>
            ))}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
