import React, { useState, useEffect } from 'react';
import { Layers, Plus, Calendar, X } from 'lucide-react';
import { getAllBatches, createBatch, logAdminAction } from '../../../lib/admin';
import type { Batch } from '../../../types/batch';
import AdminLayout from './AdminLayout';

export const AdminBatchesManager: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(300);
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadBatches = async () => {
    setLoading(true);
    const list = await getAllBatches();
    setBatches(list);
    setLoading(false);
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg('');

    const res = await createBatch({
      name: name.trim(),
      targetQuantity: Number(targetQuantity),
      expectedDispatchDate: expectedDispatchDate || undefined,
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      void logAdminAction('create_batch', 'batch', res.batch?.id || '', {
        name,
        targetQuantity,
      });
      setShowModal(false);
      setName('');
      setNotes('');
      void loadBatches();
    } else {
      setErrorMsg(res.error || 'Could not create batch.');
    }
  };

  return (
    <AdminLayout
      activeTab="batches"
      title="Production Batches & Manufacturing"
      subtitle="Track physical print runs, spiral-binding assembly batches, and projected dispatch schedules."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
          <p className="text-xs text-charcoal-700">
            Managing <strong className="font-semibold text-charcoal-900">{batches.length}</strong> production runs.
          </p>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs py-1.5 px-3.5 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-charcoal-600">Loading production batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 rounded-3xl bg-ivory-100 border border-charcoal-800/10 text-center space-y-3">
            <Layers className="w-8 h-8 mx-auto text-charcoal-400" />
            <h3 className="font-bold text-sm text-charcoal-900">No production runs yet</h3>
            <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
              Create your first production batch to organize manufacturing and estimate dispatch dates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 space-y-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-500 font-mono">
                      {batch.id}
                    </span>
                    <h3 className="font-bold text-base text-charcoal-900">
                      {batch.name}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    batch.status === 'in_production'
                      ? 'bg-lavender-100 text-lavender-800 border-lavender-300'
                      : batch.status === 'completed'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-ivory-200 text-charcoal-700 border-charcoal-800/15'
                  }`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-ivory-200/60 border border-charcoal-800/5">
                    <span className="text-charcoal-500 block text-[11px]">Target Run:</span>
                    <strong className="text-sm font-bold text-charcoal-900">
                      {batch.targetQuantity} units
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-ivory-200/60 border border-charcoal-800/5">
                    <span className="text-charcoal-500 block text-[11px]">Target Dispatch:</span>
                    <strong className="text-xs font-bold text-charcoal-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-lavender-700" />
                      {batch.expectedDispatchDate
                        ? new Date(batch.expectedDispatchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'To be confirmed'}
                    </strong>
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-xs text-charcoal-600 bg-ivory-200/40 p-2.5 rounded-xl border border-charcoal-800/5 italic">
                    "{batch.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory-100 rounded-3xl border border-charcoal-800/20 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
              <h3 className="font-bold text-base text-charcoal-900">
                Create Production Batch
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-charcoal-500 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Batch Name / Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Batch #3 — Spring Production Run"
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-800">Target Quantity</label>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-800">Expected Dispatch</label>
                  <input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-800">Manufacturing Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Details regarding paper supply, top spiral vendor, packaging..."
                  className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
                />
              </div>

              {errorMsg && <p className="text-red-700 text-xs">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-charcoal-800/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {submitting ? 'Saving...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBatchesManager;
