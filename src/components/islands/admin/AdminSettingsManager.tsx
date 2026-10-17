import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, ShieldCheck, Phone, Truck } from 'lucide-react';
import { getStoreSettings, updateStoreSettings, logAdminAction } from '../../../lib/admin';
import type { StoreSettings } from '../../../types/admin';
import AdminLayout from './AdminLayout';

export const AdminSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const s = await getStoreSettings();
      setSettings(s);
      setLoading(false);
    }
    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || saving) return;

    setSaving(true);
    await updateStoreSettings(settings);
    void logAdminAction('update_store_settings', 'settings', 'global', settings);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (loading || !settings) {
    return (
      <AdminLayout activeTab="settings" title="Store Operational Settings">
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-charcoal-600">Loading settings...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activeTab="settings"
      title="Store Operational Settings"
      subtitle="Configure customer support channels, delivery guidelines, and approved legal policy terms."
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span>Store settings saved successfully and updated across the customer portal!</span>
          </div>
        )}

        {/* 1. Support Channels */}
        <div className="p-6 rounded-3xl bg-ivory-100 border border-charcoal-800/10 space-y-4 shadow-soft">
          <h2 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-lavender-700" />
            <span>Customer Support Channels</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Support WhatsApp Number *</label>
              <input
                type="text"
                required
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200 font-mono"
              />
              <p className="text-[11px] text-charcoal-500">Must include country code: +91 7023987458</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Support Email Address *</label>
              <input
                type="email"
                required
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
              />
              <p className="text-[11px] text-charcoal-500">Official customer inbox: support@cumid.store</p>
            </div>
          </div>
        </div>

        {/* 2. Shipping & Delivery Rules */}
        <div className="p-6 rounded-3xl bg-ivory-100 border border-charcoal-800/10 space-y-4 shadow-soft">
          <h2 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-lavender-700" />
            <span>Delivery &amp; Packaging Guidelines</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Default Shipping Charge (₹)</label>
              <input
                type="number"
                min={0}
                value={settings.defaultShippingPaise / 100}
                onChange={(e) => setSettings({ ...settings, defaultShippingPaise: Number(e.target.value) * 100 })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Estimated Delivery Timeline</label>
              <input
                type="text"
                value={settings.estimatedDeliveryDays}
                onChange={(e) => setSettings({ ...settings, estimatedDeliveryDays: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
              />
            </div>
          </div>
        </div>

        {/* 3. Compliance & Retention */}
        <div className="p-6 rounded-3xl bg-ivory-100 border border-charcoal-800/10 space-y-4 shadow-soft">
          <h2 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-lavender-700" />
            <span>DPDP &amp; Customer Protection Policy</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Enquiry Retention (Days)</label>
              <input
                type="number"
                min={30}
                value={settings.enquiryRetentionDays}
                onChange={(e) => setSettings({ ...settings, enquiryRetentionDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Inactive Account Retention (Days)</label>
              <input
                type="number"
                min={60}
                value={settings.accountRetentionDays}
                onChange={(e) => setSettings({ ...settings, accountRetentionDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-800">Damage Reporting Window (Days)</label>
              <input
                type="number"
                min={1}
                value={settings.returnWindowDays}
                onChange={(e) => setSettings({ ...settings, returnWindowDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-charcoal-800/15 bg-ivory-200"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs py-2.5 px-6 gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-ivory-100 border-t-transparent rounded-full animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Store Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
};

export default AdminSettingsManager;
