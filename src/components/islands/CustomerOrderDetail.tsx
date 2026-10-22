import React, { useState, useEffect } from 'react';
import { Truck, AlertCircle, MapPin, Check, ArrowLeft, MessageCircle } from 'lucide-react';
import { getOrderById, requestOrderCancellation } from '../../lib/orders';
import { formatPaiseToINR, type Order, type OrderStatus } from '../../types/order';
import { SITE } from '../../config/site';

interface Props {
  orderId: string;
}

const STEP_ORDER: OrderStatus[] = [
  'awaiting_confirmation',
  'confirmed',
  'in_production',
  'ready',
  'dispatched',
  'delivered',
];

const STEP_LABELS: Record<string, string> = {
  awaiting_confirmation: 'Awaiting Confirmation',
  confirmed: 'Confirmed',
  in_production: 'In Production',
  ready: 'Batch Ready',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
};

export const CustomerOrderDetail: React.FC<Props> = ({ orderId }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      const res = await getOrderById(orderId);
      setOrder(res);
      setLoading(false);
    }
    void fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-charcoal-700">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto p-8 rounded-3xl bg-ivory-100 border border-charcoal-800/10">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-charcoal-900">Order not found</h2>
        <p className="text-xs text-charcoal-700">
          The requested order reference does not exist or you do not have permission to view it.
        </p>
        <div className="pt-2">
          <a href="/account/orders" className="btn-secondary text-xs">
            Return to My Orders
          </a>
        </div>
      </div>
    );
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    setCancelSubmitting(true);
    setErrorMsg('');

    const res = await requestOrderCancellation(order.id, cancelReason);
    setCancelSubmitting(false);

    if (res.success) {
      setCancelSuccess(true);
      setTimeout(() => {
        setShowCancelModal(false);
        setCancelSuccess(false);
        // Refresh order
        void getOrderById(orderId).then(setOrder);
      }, 2000);
    } else {
      setErrorMsg(res.error || 'Could not submit cancellation request.');
    }
  };

  const isCancellable = ['draft', 'awaiting_confirmation', 'confirmed', 'in_production'].includes(order.status);
  const currentStepIndex = STEP_ORDER.indexOf(order.status);

  const helpWhatsAppUrl = `${SITE.whatsappBaseUrl}?text=${encodeURIComponent(
    `Hi CUMID! I need assistance with my order ${order.orderNumber}.`
  )}`;

  return (
    <div className="space-y-8">
      {order.paymentStatus && <div className="p-4 border border-charcoal-800/10 space-y-2"><p>Payment: {order.paymentStatus.replaceAll('_', ' ')}</p>{order.dispatchSnapshot && <p>Agreed dispatch: {order.dispatchSnapshot}</p>}{order.saleSnapshot && <p>{order.saleSnapshot}</p>}<a href={'/checkout?order='+order.id} className="underline">Check payment status</a></div>}
      {/* Top Bar with back link */}
      <div className="flex items-center justify-between pb-4 border-b border-charcoal-800/10">
        <a href="/account/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Orders</span>
        </a>

        <div className="flex items-center gap-2">
          <a
            href={helpWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
            title="Chat about this order on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-green-700" />
            <span>Order Help</span>
          </a>
        </div>
      </div>

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-ivory-100 border border-charcoal-800/10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-charcoal-900">
              {order.orderNumber}
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-lavender-100 text-lavender-800 border border-lavender-300">
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-charcoal-500">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-charcoal-500 block">Agreed Order Total</span>
          <span className="text-2xl font-extrabold text-charcoal-900">
            {formatPaiseToINR(order.totalPaise)}
          </span>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      {!['cancelled', 'refunded'].includes(order.status) && (
        <div className="p-6 rounded-3xl bg-ivory-100 border border-charcoal-800/10 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-600">
            Production &amp; Dispatch Status
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {STEP_ORDER.map((step, idx) => {
              const isDone = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step} className="space-y-2 text-center">
                  <div className={`h-1.5 rounded-full transition-colors ${
                    isDone ? 'bg-lavender-700' : 'bg-charcoal-200'
                  }`} />
                  <span className={`text-[11px] block leading-tight ${
                    isCurrent ? 'font-bold text-lavender-800' : isDone ? 'text-charcoal-800 font-medium' : 'text-charcoal-400'
                  }`}>
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>

          {order.trackingNumber && (
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-700" />
                <span>
                  Dispatched via <strong>{order.trackingCarrier}</strong> · Tracking ID: <strong>{order.trackingNumber}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Notice if Cancelled */}
      {order.status === 'cancelled' && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            This order has been cancelled.
          </p>
          {order.cancellationReason && (
            <p className="text-red-800">Reason: {order.cancellationReason}</p>
          )}
        </div>
      )}

      {/* Items & Price Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Items Snapshot */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold text-charcoal-900">
            Ordered Pocket Diaries (Snapshot)
          </h2>

          <div className="rounded-2xl bg-ivory-100 border border-charcoal-800/10 divide-y divide-charcoal-800/10 overflow-hidden">
            {order.items?.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-semibold text-sm text-charcoal-900 block">
                    {item.productName}
                  </span>
                  <span className="text-xs text-charcoal-500 font-mono">
                    Ref: {item.productId}
                  </span>
                  <p className="text-xs text-charcoal-600">
                    Unit Price: {formatPaiseToINR(item.unitPricePaise)} × {item.quantity}
                  </p>
                </div>

                <span className="font-mono font-bold text-sm text-charcoal-900">
                  {formatPaiseToINR(item.totalPricePaise)}
                </span>
              </div>
            ))}
          </div>

          {/* Cancellation / Help Request Button */}
          <div className="pt-4">
            {isCancellable ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-red-700 hover:text-red-900 underline underline-offset-2 transition-colors"
              >
                Request order cancellation or modification
              </button>
            ) : (
              <p className="text-xs text-charcoal-500 italic">
                * Order is in transit or completed. For transit damage or return assistance, see our <a href="/returns-cancellations" className="underline">Returns Policy</a>.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Address & Payment Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Totals Card */}
          <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-600">
              Agreed Pricing Summary
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-700">
                <span>Items Subtotal</span>
                <span className="font-mono">{formatPaiseToINR(order.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-charcoal-700">
                <span>Shipping &amp; Packaging</span>
                <span className="font-mono">
                  {order.shippingPaise === 0 ? 'FREE' : formatPaiseToINR(order.shippingPaise)}
                </span>
              </div>
              <div className="pt-2 border-t border-charcoal-800/10 flex justify-between text-sm font-bold text-charcoal-900">
                <span>Total Amount</span>
                <span className="font-mono">{formatPaiseToINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-2 text-xs">
              <h2 className="font-bold uppercase tracking-wider text-charcoal-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Delivery Address
              </h2>
              <div className="text-charcoal-800 leading-relaxed">
                <p className="font-semibold text-charcoal-900">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.landmark && <p>Near: {order.shippingAddress.landmark}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="pt-1 text-charcoal-600">Phone: {order.shippingAddress.phone}</p>
              </div>
            </div>
          )}

          {/* Event Timeline */}
          {order.events && order.events.length > 0 && (
            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-600">
                Order Activity Log
              </h2>
              <div className="space-y-3 text-xs">
                {order.events.map((ev) => (
                  <div key={ev.id} className="border-l-2 border-lavender-400 pl-3 space-y-0.5">
                    <p className="text-charcoal-800 font-medium">{ev.description}</p>
                    <p className="text-[10px] text-charcoal-400">
                      {new Date(ev.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Request Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory-100 rounded-3xl border border-charcoal-800/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-charcoal-900">
              Request Order Cancellation
            </h3>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              Orders can be cancelled before production batches are finalized. Please let us know the reason for cancellation:
            </p>

            {cancelSuccess ? (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-700" />
                <span>Cancellation request submitted successfully. We will follow up on WhatsApp.</span>
              </div>
            ) : (
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation or change request..."
                  required
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-charcoal-800/20 bg-ivory-200 focus:outline-none focus:ring-2 focus:ring-lavender-600"
                />

                {errorMsg && (
                  <p className="text-xs text-red-700">{errorMsg}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelSubmitting}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={cancelSubmitting || !cancelReason.trim()}
                    className="btn-primary text-xs py-2 px-4 bg-red-700 hover:bg-red-800 text-ivory-100 disabled:opacity-50"
                  >
                    {cancelSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderDetail;
