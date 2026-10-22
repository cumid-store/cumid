/**
 * CUMID Store — Central Launch Configuration
 * Controls e-commerce mode, enquiry state, and payment safety switches across the application.
 */

export const LAUNCH_CONFIG = {
  /**
   * Legacy catalogue default only. The checkout API is authoritative:
   * commerce_settings.enabled + confirmed products + server gateway configuration.
   * Never use a public/browser flag to authorise payments.
   */
  ALLOW_PURCHASES: false,

  /**
   * Global launch status: all products are sold out and preorders are enquiry-only.
   */
  CATALOG_SOLD_OUT: true,

  /**
   * Preorder enquiry via WhatsApp enabled.
   */
  PREORDER_ENQUIRIES_ENABLED: true,

  /**
   * Whether to display price on public cards or require WhatsApp confirmation.
   * By rule: "Do not invent prices or discounts... Price only if confirmed, otherwise: Pricing will be confirmed on WhatsApp"
   */
  PRICE_DISPLAY_MODE: 'enquiry_confirmation_required' as const,

  /**
   * Supabase integration status
   * Browsing and WhatsApp must work 100% even if Supabase is offline, unconfigured, or quota reached.
   */
  SUPABASE_OPTIONAL: true,

  /**
   * Analytics consent strictness:
   * GA4 is NEVER loaded prior to explicit user opt-in.
   */
  ANALYTICS_STRICT_CONSENT: true,
} as const;
