import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, MessageCircle, Search, ShoppingBag, Edit3 
} from 'lucide-react';
import { getAllEnquiries, updateEnquiryStatus } from '../../../lib/enquiries';
import { logAdminAction } from '../../../lib/admin';
import type { Enquiry, EnquiryStatus } from '../../../types/enquiry';
import AdminLayout from './AdminLayout';

export const AdminEnquiriesManager: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const loadEnquiries = async () => {
    setLoading(true);
    const list = await getAllEnquiries(filterStatus);
    setEnquiries(list);
    setLoading(false);
  };

  useEffect(() => {
    void loadEnquiries();
  }, [filterStatus]);

  const handleStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    await updateEnquiryStatus(enquiryId, newStatus);
    void logAdminAction('update_enquiry_status', 'enquiry', enquiryId, { newStatus });
    void loadEnquiries();
  };

  const handleSaveNotes = async (enquiryId: string) => {
    const enq = enquiries.find((e) => e.id === enquiryId);
    if (!enq) return;
    await updateEnquiryStatus(enquiryId, enq.status, editNotes);
    void logAdminAction('update_enquiry_notes', 'enquiry', enquiryId, { notes: editNotes });
    setEditingId(null);
    void loadEnquiries();
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.productName.toLowerCase().includes(q) ||
      e.productId.toLowerCase().includes(q) ||
      (e.customerName && e.customerName.toLowerCase().includes(q)) ||
      (e.customerPhone && e.customerPhone.includes(q))
    );
  });

  return (
    <AdminLayout
      activeTab="enquiries"
      title="Preorder Enquiries Inbox"
      subtitle="Follow up on WhatsApp interest, record quotes, and convert discussions into confirmed orders."
    >
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'new', 'contacted', 'quoted', 'converted', 'closed'].map((st) => (
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
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-charcoal-800/15 bg-ivory-100 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-600 w-44 sm:w-56"
            />
          </div>
        </div>

        {/* Enquiries List */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-charcoal-600">Loading enquiries...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-12 rounded-3xl bg-ivory-100 border border-charcoal-800/10 text-center space-y-3">
            <MessageSquare className="w-8 h-8 mx-auto text-charcoal-400" />
            <h3 className="font-bold text-sm text-charcoal-900">No enquiries found</h3>
            <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
              Preorder enquiries sent from the product pages will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEnquiries.map((enq) => {
              const cleanPhone = enq.customerPhone ? enq.customerPhone.replace(/\D/g, '') : null;
              const directChatUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hi ${enq.customerName || 'there'}! This is CUMID following up regarding your preorder enquiry for the ${enq.productName} diary.`
                  )}`
                : null;

              return (
                <div
                  key={enq.id}
                  className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-3 shadow-soft"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-charcoal-800/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-charcoal-900">{enq.productName}</span>
                        <span className="font-mono text-xs text-charcoal-500">Ref: {enq.productId}</span>
                      </div>
                      <p className="text-xs text-charcoal-600">
                        Requested Quantity: <strong className="text-charcoal-900">{enq.quantity} unit(s)</strong>
                        {enq.customerName && ` · Customer: ${enq.customerName}`}
                        {enq.customerPhone && ` (${enq.customerPhone})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* State Select */}
                      <select
                        value={enq.status}
                        onChange={(e) => handleStatusChange(enq.id, e.target.value as EnquiryStatus)}
                        className="text-xs font-semibold py-1 px-3 rounded-full border border-charcoal-800/20 bg-ivory-200 capitalize focus:outline-none focus:ring-1 focus:ring-lavender-600"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="quoted">Quoted</option>
                        <option value="converted">Converted</option>
                        <option value="closed">Closed</option>
                      </select>

                      {directChatUrl && (
                        <a
                          href={directChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-whatsapp text-xs py-1.5 px-3 gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Chat</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Notes & Follow-up Section */}
                  <div className="text-xs text-charcoal-700 space-y-2">
                    {editingId === enq.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-charcoal-800/20 bg-ivory-200 text-xs"
                          placeholder="Add conversation notes, quoted prices, or special requests..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-secondary text-xs py-1 px-2.5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(enq.id)}
                            className="btn-primary text-xs py-1 px-2.5"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-charcoal-600">
                        <p className="italic">
                          {enq.notes ? `Note: ${enq.notes}` : 'No notes recorded.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(enq.id);
                            setEditNotes(enq.notes || '');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-lavender-700 hover:underline"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Note</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timestamp & Convert Shortcut */}
                  <div className="pt-2 border-t border-charcoal-800/5 flex items-center justify-between text-[11px] text-charcoal-400">
                    <span>Received on {new Date(enq.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <a
                      href={`/admin/orders`}
                      className="text-lavender-800 font-semibold hover:underline flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Convert to Order Draft &rarr;</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEnquiriesManager;
