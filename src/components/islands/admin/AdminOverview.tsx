import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, MessageSquare, Package, Truck, 
  Plus, IndianRupee 
} from 'lucide-react';
import { getAdminStats } from '../../../lib/admin';
import { getAllOrders } from '../../../lib/orders';
import { getAllEnquiries } from '../../../lib/enquiries';
import { formatPaiseToINR, type Order } from '../../../types/order';
import type { Enquiry } from '../../../types/enquiry';
import type { AdminStats } from '../../../types/admin';
import AdminLayout from './AdminLayout';

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [s, o, e] = await Promise.all([
        getAdminStats(),
        getAllOrders(),
        getAllEnquiries(),
      ]);
      setStats(s);
      setRecentOrders(o.slice(0, 4));
      setRecentEnquiries(e.slice(0, 4));
      setLoading(false);
    }
    void loadData();
  }, []);

  return (
    <AdminLayout
      activeTab="overview"
      title="Store Operations Overview"
      subtitle="Track customer preorder enquiries, batch manufacturing progress, and order fulfillment."
    >
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-charcoal-600">Calculating store metrics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-2">
              <div className="flex items-center justify-between text-charcoal-500 text-xs">
                <span>New Enquiries</span>
                <MessageSquare className="w-4 h-4 text-lavender-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-charcoal-900">
                {stats?.newEnquiries || 0}
              </div>
              <p className="text-[11px] text-charcoal-500">
                {stats?.totalEnquiries || 0} total enquiries recorded
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-2">
              <div className="flex items-center justify-between text-charcoal-500 text-xs">
                <span>In Production</span>
                <Package className="w-4 h-4 text-lavender-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-charcoal-900">
                {stats?.inProductionOrders || 0}
              </div>
              <p className="text-[11px] text-charcoal-500">
                {stats?.awaitingConfirmationOrders || 0} awaiting confirmation
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-2">
              <div className="flex items-center justify-between text-charcoal-500 text-xs">
                <span>Dispatched</span>
                <Truck className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-charcoal-900">
                {stats?.dispatchedOrders || 0}
              </div>
              <p className="text-[11px] text-charcoal-500">
                With courier tracking
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-2">
              <div className="flex items-center justify-between text-charcoal-500 text-xs">
                <span>Agreed Value</span>
                <IndianRupee className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-charcoal-900">
                {formatPaiseToINR(stats?.totalRevenuePaise || 0)}
              </div>
              <p className="text-[11px] text-charcoal-500">
                {stats?.totalOrders || 0} total active orders
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-4 rounded-2xl bg-lavender-50 border border-lavender-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-lavender-950">
              Quick Management Shortcuts:
            </span>
            <div className="flex items-center gap-2">
              <a href="/admin/orders" className="btn-primary text-xs py-1.5 px-3 gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Create WhatsApp Order</span>
              </a>
              <a href="/admin/enquiries" className="btn-secondary text-xs py-1.5 px-3">
                Manage Enquiries
              </a>
              <a href="/admin/batches" className="btn-secondary text-xs py-1.5 px-3">
                Add Batch Run
              </a>
            </div>
          </div>

          {/* Two-Column Grid: Recent Enquiries vs Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Recent Enquiries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
                <h2 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-lavender-700" />
                  <span>Recent Preorder Enquiries</span>
                </h2>
                <a href="/admin/enquiries" className="text-xs text-lavender-700 hover:underline font-semibold">
                  View all ({stats?.totalEnquiries || 0})
                </a>
              </div>

              {recentEnquiries.length === 0 ? (
                <div className="p-6 rounded-2xl bg-ivory-100 border border-charcoal-800/10 text-center text-xs text-charcoal-600">
                  No preorder enquiries logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEnquiries.map((enq) => (
                    <div
                      key={enq.id}
                      className="p-4 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-charcoal-900">{enq.productName}</span>
                        <span className="px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] bg-ivory-200 border border-charcoal-800/10 text-charcoal-700">
                          {enq.status}
                        </span>
                      </div>
                      <p className="text-charcoal-600">
                        Requested: <strong className="text-charcoal-800">{enq.quantity}</strong> unit(s)
                        {enq.customerName && ` · Customer: ${enq.customerName}`}
                      </p>
                      {enq.notes && (
                        <p className="text-charcoal-500 italic text-[11px] truncate">
                          "{enq.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
                <h2 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-lavender-700" />
                  <span>Recent Production Orders</span>
                </h2>
                <a href="/admin/orders" className="text-xs text-lavender-700 hover:underline font-semibold">
                  View all ({stats?.totalOrders || 0})
                </a>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-6 rounded-2xl bg-ivory-100 border border-charcoal-800/10 text-center text-xs text-charcoal-600">
                  No orders recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-charcoal-900">{ord.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] bg-lavender-100 text-lavender-800 border border-lavender-300">
                          {ord.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between text-charcoal-600">
                        <span>{ord.customerName} ({ord.customerPhone})</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {formatPaiseToINR(ord.totalPaise)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOverview;
