import React, { useState, useEffect } from 'react';
import { Package, Clock, Truck, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCustomerOrders } from '../../lib/orders';
import { formatPaiseToINR, type Order, type OrderStatus } from '../../types/order';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-charcoal-100 text-charcoal-700 border-charcoal-300', icon: Clock },
  awaiting_confirmation: { label: 'Awaiting Confirmation', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
  in_production: { label: 'In Production', color: 'bg-lavender-100 text-lavender-800 border-lavender-300', icon: Package },
  ready: { label: 'Ready for Dispatch', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Package },
  dispatched: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-stone-100 text-stone-800 border-stone-300', icon: AlertCircle },
};

export const CustomerOrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      let currentUserId: string | undefined;

      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          currentUserId = session.user.id;
        }
      }

      const list = await getCustomerOrders(currentUserId);
      setOrders(list);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-charcoal-700">Loading your orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto p-8 rounded-3xl bg-ivory-100 border border-charcoal-800/10">
        <div className="w-14 h-14 mx-auto rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-600">
          <Package className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-charcoal-900">No orders placed yet</h2>
          <p className="text-xs text-charcoal-700 leading-relaxed">
            All orders are arranged following an enquiry on WhatsApp. Once pricing and production batch details are confirmed, your agreed order will appear here.
          </p>
        </div>
        <div className="pt-2">
          <a href="/shop" className="btn-primary text-xs gap-2">
            <span>Browse 13 diary covers</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
        <p className="text-xs text-charcoal-700">
          Showing <strong className="font-semibold text-charcoal-900">{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'}.
        </p>
        <span className="text-[11px] text-charcoal-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
          Private &amp; isolated account records
        </span>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
          const StatusIcon = cfg.icon;

          return (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 hover:border-charcoal-800/20 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-charcoal-800/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-charcoal-900">
                      {order.orderNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs text-charcoal-500 block">Agreed Total:</span>
                  <span className="text-sm font-bold text-charcoal-900">
                    {formatPaiseToINR(order.totalPaise)}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div className="space-y-1">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-charcoal-700">
                    <span>
                      {item.productName} <strong className="text-charcoal-900">× {item.quantity}</strong>
                    </span>
                    <span className="font-mono text-charcoal-900">
                      {formatPaiseToINR(item.totalPricePaise)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action row */}
              <div className="pt-2 flex items-center justify-between">
                {order.trackingNumber ? (
                  <span className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    Tracking: {order.trackingNumber} ({order.trackingCarrier})
                  </span>
                ) : (
                  <span className="text-xs text-charcoal-500 italic">
                    Tracking assigned upon batch dispatch
                  </span>
                )}

                <a
                  href={`/account/orders/${order.id}`}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerOrdersList;
