/**
 * CUMID Store — Central Site Configuration
 * Single source of truth for business facts, routing, WhatsApp parameters, and meta.
 */

export const SITE = {
  name: 'CUMID',
  tagline: 'Small diaries. A little more you.',
  description: 'Square pocket diaries. Top spiral binding. Covers with a little personality.',
  canonicalUrl: 'https://cumid.store',
  market: 'India',
  currency: 'INR',
  currencySymbol: '₹',

  // Customer Contact Facts
  whatsappNumber: '919201871597', // Standard international without punctuation
  supportEmail: 'support@cumid.store',
  whatsappDisplayNumber: '+91 9201871597',
  whatsappBaseUrl: 'https://wa.me/919201871597',

  // Launch Status Announcement
  announcementText: 'Pocket diaries with personality · Check availability or enquire on WhatsApp',
  heroHeadline: 'Small diaries. A little more you.',
  heroSubcopy: 'Pocket-sized ideas, personality-filled covers, and space for whatever’s on your mind.',

  // Product Format Facts (strictly confirmed facts only)
  productFormat: {
    shape: 'Square',
    binding: 'Spiral binding along the top edge',
    sizeType: 'Pocket-sized',
    // Note: GSM, exact dimensions, and page counts are owner-confirmed inputs and not fabricated
  },

  // Personality Themes
  themes: [
    { id: 'originals', name: 'Originals', slug: 'originals', description: 'Doodles, desi details and illustrated worlds.' },
    { id: 'floral', name: 'Floral', slug: 'floral', description: 'Soft blossoms, botanical reverie, and calm night skies.' },
    { id: 'cute', name: 'Cute', slug: 'cute', description: 'Relatable characters, sleepy companions, and everyday warmth.' },
    { id: 'hinglish', name: 'Hinglish', slug: 'hinglish', description: 'Witty, colloquial banter and relatable work-life ironies.' },
    { id: 'cars-and-jets', name: 'Cars & Jets', slug: 'cars-and-jets', description: 'High-octane machines, speed, and restless ambition.' },
  ],

  // Navigation Links
  navLinks: [
    { label: 'Shop', href: '/shop' },
    { label: 'Collections', href: '/shop#collections' },
    { label: 'Our Story', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Careers', href: '/careers' },
  ],

  // Footer Navigation
  footerLinks: {
    shop: [
      { label: 'All Covers', href: '/shop' },
      { label: 'Floral Collection', href: '/collections/floral' },
      { label: 'Cute Collection', href: '/collections/cute' },
      { label: 'Hinglish Collection', href: '/collections/hinglish' },
      { label: 'Cars & Jets Collection', href: '/collections/cars-and-jets' },
      { label: 'Originals Collection', href: '/collections/originals' },
    ],
    info: [
      { label: 'Checkout', href: '/checkout', isExternal: false },
      { label: 'Careers & Internships', href: '/careers', isExternal: false },
      { label: 'Submit a Task', href: '/careers/tasks', isExternal: false },
      { label: 'How Preorders Work', href: '/how-preorders-work', isExternal: false },
      { label: 'My Orders', href: '/account/orders', isExternal: false },
      { label: 'About CUMID', href: '/about', isExternal: false },
      { label: 'Journal & Stories', href: '/journal', isExternal: false },
      { label: 'Frequently Asked Questions', href: '/faq', isExternal: false },
      { label: 'Store Management (Admin)', href: '/admin', isExternal: false },
      { label: 'Contact WhatsApp', href: 'https://wa.me/919201871597', isExternal: true },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Shipping & Delivery', href: '/shipping' },
      { label: 'Returns & Cancellations', href: '/returns-cancellations' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
} as const;

/**
 * Builds the exact safe WhatsApp preorder link for a product.
 * Template:
 * "Hi CUMID! I’m interested in the [PRODUCT NAME] diary, reference [PRODUCT ID]. Please share the confirmed price, specifications and next-batch availability. Product: [CANONICAL PRODUCT URL]"
 */
export function buildProductWhatsAppUrl(product: { name: string; id: string; slug: string }): string {
  const canonicalProductUrl = `${SITE.canonicalUrl}/products/${product.slug}`;
  const message = `Hi CUMID! I’m interested in the ${product.name} diary, reference ${product.id}. Please share the confirmed price, specifications and next-batch availability. Product: ${canonicalProductUrl}`;
  return `${SITE.whatsappBaseUrl}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds the generic general WhatsApp enquiry URL.
 */
export function buildGeneralWhatsAppUrl(context: string = 'preorder enquiry'): string {
  const message = `Hi CUMID! I’m visiting cumid.store and would like to enquire about your next batch of pocket diaries (${context}).`;
  return `${SITE.whatsappBaseUrl}?text=${encodeURIComponent(message)}`;
}
