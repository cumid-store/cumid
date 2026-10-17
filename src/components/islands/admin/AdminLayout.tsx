import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingBag, MessageSquare, Package, 
  Layers, Settings, ShieldAlert, LogIn, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getCurrentProfile } from '../../../lib/supabase';

interface Props {
  activeTab: 'overview' | 'orders' | 'enquiries' | 'products' | 'batches' | 'settings';
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<Props> = ({
  activeTab,
  title,
  subtitle,
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoAdmin, setDemoAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      // Check demo admin override from session storage
      if (typeof window !== 'undefined' && sessionStorage.getItem('cumid_demo_admin_active') === 'true') {
        setDemoAdmin(true);
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserEmail(session.user.email || null);
          const profile = await getCurrentProfile();
          if (profile?.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.warn('Admin check note:', err);
      } finally {
        setLoading(false);
      }
    }
    void checkAuth();
  }, []);

  const handleEnableDemoAdmin = () => {
    sessionStorage.setItem('cumid_demo_admin_active', 'true');
    setDemoAdmin(true);
    setIsAdmin(true);
  };

  const handleDisableDemoAdmin = () => {
    sessionStorage.removeItem('cumid_demo_admin_active');
    setDemoAdmin(false);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lavender-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authorized as admin
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-ivory-100 border border-charcoal-800/15 space-y-6 shadow-soft">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-charcoal-900">
            CUMID Admin Authentication Required
          </h1>
          <p className="text-xs text-charcoal-700 leading-relaxed">
            The store management dashboard is restricted to verified store administrators. Permission is strictly enforced at the database level using Supabase Row-Level Security (<code className="font-mono text-[11px] bg-ivory-200 px-1 py-0.5 rounded">role = 'admin'</code>).
          </p>
        </div>

        <div className="p-4 rounded-xl bg-ivory-200/80 border border-charcoal-800/10 text-xs text-charcoal-700 space-y-2">
          <p className="font-semibold text-charcoal-900">Owner Setup Instructions:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Sign in using your Google account via the customer portal.</li>
            <li>In Supabase Dashboard, set your profile's <code className="font-mono">role</code> column to <code className="font-mono">'admin'</code>.</li>
            <li>Return here to access the live database management dashboard.</li>
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href="/account"
            className="btn-primary w-full text-xs justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Go to Google Sign-In</span>
          </a>

          <button
            type="button"
            onClick={handleEnableDemoAdmin}
            className="btn-secondary w-full text-xs justify-center text-charcoal-700"
          >
            <span>Enable Local Demo Admin Preview</span>
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { id: 'enquiries', label: 'Preorder Enquiries', href: '/admin/enquiries', icon: MessageSquare },
    { id: 'products', label: 'Products', href: '/admin/products', icon: Package },
    { id: 'batches', label: 'Production Batches', href: '/admin/batches', icon: Layers },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="space-y-8">
      {/* Admin Warning Banner if in Demo Mode */}
      {demoAdmin && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span><strong>Demo Admin Preview Active:</strong> Changes are saved to local demonstration storage. Connect Supabase with role='admin' for live PostgreSQL persistence.</span>
          </span>
          <button
            type="button"
            onClick={handleDisableDemoAdmin}
            className="text-[11px] underline font-semibold text-amber-950 hover:text-black ml-2"
          >
            Exit Demo
          </button>
        </div>
      )}

      {/* Admin Header with Navigation */}
      <header className="space-y-4 pb-6 border-b border-charcoal-800/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-lavender-700">
                Store Operations
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800 border border-sage-300">
                <ShieldCheck className="w-3 h-3" />
                {userEmail ? `${userEmail} (Admin)` : demoAdmin ? 'Demo Admin' : 'Admin Access Verified'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mt-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-charcoal-600 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 px-3 gap-1.5"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Admin Sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-charcoal-900 text-ivory-100 shadow-sm'
                    : 'bg-ivory-100 text-charcoal-700 hover:bg-ivory-200 border border-charcoal-800/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main>{children}</main>
    </div>
  );
};

export default AdminLayout;
