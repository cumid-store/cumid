import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Truck, ChevronDown, ChevronUp, Package, X 
} from 'lucide-react';
import { getAllOrders, createOrderDraft, updateOrderStatus, updateOrderTracking } from '../../../lib/orders';
import { logAdminAction } from '../../../lib/admin';
import { formatPaiseToINR, type Order, type OrderStatus } from '../../../types/order';
import { PRODUCTS } from '../../../data/products';
import AdminLayout from './AdminLayout';

export const AdminOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Order Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form fields
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [selectedProdSlug, setSelectedProdSlug] = useState('lavender-bloom');
  const [itemQty, setItemQty] = useState(1);
  const [agreedPriceRupees, setAgreedPriceRupees] = useState(499);
  const [shippingRupees, setShippingRupees] = useState(50);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');

  // Tracking Modal State
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('India Post Speed Post');
  const [trackingNum, setTrackingNum] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    const list = await getAllOrders(filterStatus);
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    void loadOrders();
  }, [filterStatus]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg('');

    const product = PRODUCTS.find((p) => p.slug === selectedProdSlug) || PRODUCTS[0];
    const unitPricePaise = Math.round(Number(agreedPriceRupees) * 100);
    const shippingPaise = Math.round(Number(shippingRupees) * 100);

    const res = await createOrderDraft({
      customerName: custName,
      customerPhone: custPhone,
      customerEmail: custEmail || undefined,
      shippingAddress: street ? {
        fullName: custName,
        phone: custPhone,
        street,
        city,
        state,
        pincode,
      } : undefined,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: itemQty,
          unitPricePaise,
        },
      ],
      shippingPaise,
      notes,
    });

    setSubmitting(false);

    if (res.success) {
      void logAdminAction('create_order_draft', 'order', res.order?.id || '', {
        orderNumber: res.order?.orderNumber,
        customerName: custName,
      });
      setShowModal(false);
      // Reset form
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setStreet('');
      setNotes('');
      void loadOrders();
    } else {
      setErrorMsg(res.error || 'Failed to create order draft.');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
    void logAdminAction('update_order_status', 'order', orderId, { newStatus });
    void loadOrders();
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingOrderId || !trackingNum.trim()) return;

    await updateOrderTracking(trackingOrderId, trackingNum.trim(), carrier);
    void logAdminAction('assign_tracking', 'order', trackingOrderId, {
      carrier,
      trackingNum: trackingNum.trim(),
    });
    setTrackingOrderId(null);
    setTrackingNum('');
    void loadOrders();
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q)
    );
  });

  return (
    <AdminLayout
      activeTab="orders"
      title="Production & Customer Orders"
      subtitle="Manage agreed WhatsApp customer orders, snapshot pricing, production stages, and courier tracking."
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'draft', 'in_production', 'dispatched', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  filterStatus === st
                    ? 'bg-lavender-700 text-ivory-100'
                    : 'bg-ivory-100 text-charcoal-700 border border-charcoal-800/10 hover:bg-ivory-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-charcoal-800/15 bg-ivory-100 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-600 w-44 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary text-xs py-1.5 px-3.5 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          </div>
        </div>

        {/* Orders Table / Cards */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-charcoal-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 rounded-3xl bg-ivory-100 border border-charcoal-800/10 text-center space-y-3">
            <Package className="w-8 h-8 mx-auto text-charcoal-400" />
            <h3 className="font-bold text-sm text-charcoal-900">No matching orders found</h3>
            <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
              Create an order draft once pricing and quantity have been confirmed with a customer on WhatsApp.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isExpanded = expandedId === order.id;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-ivory-100 border border-charcoal-800/10 overflow-hidden shadow-soft transition-all"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-charcoal-900">
                          {order.orderNumber}
                        </span>
                        
                        {/* Status Select dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className="text-[11px] font-semibold py-1 px-2.5 rounded-full border border-charcoal-800/20 bg-ivory-200 focus:outline-none focus:ring-1 focus:ring-lavender-600"
                        >
                          <option value="draft">Draft</option>
                          <option value="awaiting_confirmation">Awaiting Confirmation</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="in_production">In Production</option>
                          <option value="ready">Ready for Dispatch</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      <p className="text-xs text-charcoal-700">
                        <strong>{order.customerName}</strong> ({order.customerPhone})
                        {order.customerEmail && ` · ${order.customerEmail}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-[11px] text-charcoal-500 block">Total Amount:</span>
                        <span className="font-mono font-bold text-sm text-charcoal-900">
                          {formatPaiseToINR(order.totalPaise)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setTrackingOrderId(order.id)}
                            className="btn-secondary text-[11px] py-1 px-2.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{order.trackingNumber ? 'Edit Tracking' : 'Add Tracking'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="p-1.5 rounded-lg hover:bg-ivory-200 text-charcoal-600"
                          aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-charcoal-800/5 bg-ivory-200/50 space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Items Snapshot */}
                        <div>
                          <h4 className="font-bold text-charcoal-800 mb-2">Item Snapshot</h4>
                          <div className="space-y-1.5">
                            {order.items?.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-charcoal-700 bg-ivory-100 p-2.5 rounded-xl border border-charcoal-800/5">
                                <span>{it.productName} × {it.quantity}</span>
                                <span className="font-mono font-semibold">{formatPaiseToINR(it.totalPricePaise)}</span>
                              </div>
                            ))}
                            <div className="pt-1 flex justify-between text-charcoal-600 px-1">
                              <span>Shipping:</span>
                              <span className="font-mono">{formatPaiseToINR(order.shippingPaise)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Shipping & Tracking */}
                        <div>
                          <h4 className="font-bold text-charcoal-800 mb-2">Delivery &amp; Notes</h4>
                          {order.shippingAddress ? (
                            <p className="text-charcoal-700 leading-relaxed">
                              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                            </p>
                          ) : (
                            <p className="text-charcoal-500 italic">No address recorded.</p>
                          )}
                          {order.trackingNumber && (
                            <p className="mt-2 text-indigo-800 font-semibold">
                              Carrier: {order.trackingCarrier} | Waybill: {order.trackingNumber}
                            </p>
                          )}
                          {order.notes && (
                            <p className="mt-2 text-charcoal-600 italic bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                              Note: {order.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Timeline Events */}
                      {order.events && order.events.length > 0 && (
                        <div className="pt-2 border-t border-charcoal-800/5">
                          <h4 className="font-bold text-charcoal-800 mb-2">Audit History</h4>
                          <div className="space-y-1 text-[11px] text-charcoal-600">
                            {order.events.map((ev) => (
                              <div key={ev.id} className="flex items-center gap-2">
                                <span className="text-charcoal-400 font-mono">
                                  {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>— {ev.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory-100 rounded-3xl border border-charcoal-800/20 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
              <h3 className="font-bold text-base text-charcoal-900">
                Create Agreed Order Draft
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-charcoal-500 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-800">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Priya Nair"
                    className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-800">Phone (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Email Address (Optional)</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              {/* Item selection */}
              <div className="p-3 rounded-2xl bg-ivory-200/80 border border-charcoal-800/10 space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-800">Select Diary Cover *</label>
                  <select
                    value={selectedProdSlug}
                    onChange={(e) => setSelectedProdSlug(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-100"
                  >
                    {PRODUCTS.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name} ({p.collectionName}) — {p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-800">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-800">Unit Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={agreedPriceRupees}
                      onChange={(e) => setAgreedPriceRupees(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-800">Shipping (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={shippingRupees}
                      onChange={(e) => setShippingRupees(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-100"
                    />
                  </div>
                </div>

                <div className="text-right font-semibold text-xs text-charcoal-900 pt-1">
                  Calculated Total: ₹{itemQty * agreedPriceRupees + shippingRupees}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Delivery Address</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Street / House No."
                  className="w-full p-2 rounded-xl border border-charcoal-800/15 bg-ivory-200 mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="p-2 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="p-2 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="PIN Code"
                    className="p-2 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Notes / Agreement Details</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Discussed on WhatsApp Oct 17. Batch #1 dispatch expected Nov 10."
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              {errorMsg && <p className="text-red-700 text-xs">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal-800/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {submitting ? 'Creating...' : 'Create Order Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrderId && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory-100 rounded-3xl border border-charcoal-800/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-charcoal-900">
              Assign Courier Tracking Details
            </h3>

            <form onSubmit={handleSaveTracking} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Courier / Carrier</label>
                <input
                  type="text"
                  required
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. India Post, Blue Dart, DTDC"
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Tracking / Consignment Number</label>
                <input
                  type="text"
                  required
                  value={trackingNum}
                  onChange={(e) => setTrackingNum(e.target.value)}
                  placeholder="e.g. IN123456789"
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrderId(null)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-3"
                >
                  Save &amp; Mark Dispatched
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrdersManager;
