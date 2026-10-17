import type { Product } from '../types/product';

export const PRODUCTS: Product[] = [
  {
    id: 'CUMID-FL-001',
    slug: 'lavender-bloom',
    name: 'Lavender Bloom',
    tagline: 'Purple flowers, crescent moon and quiet evening thoughts.',
    shortDescription: 'Deep purple petals paired with a glowing crescent moon and constellation stars, bound with a clean top spiral.',
    longDescription: 'Lavender Bloom is inspired by quiet midnight hours when creative ideas find room to breathe. Its cover balances botanical watercolours with celestial motifs. Compact and square, it slips effortlessly into small bags or jacket pockets, ready for fleeting thoughts, poetry, or daydreams.',
    collection: 'floral',
    collectionName: 'Floral',
    images: [
      {
        src: '/products/lavender-bloom/cover.svg',
        alt: 'Lavender Bloom square pocket diary cover featuring purple botanical flowers, crescent moon, and twilight stars with top spiral binding',
        isPrimary: true,
      },
      {
        src: '/products/lavender-bloom/mockup.svg',
        alt: 'Perspective design preview of Lavender Bloom pocket diary showing square dimensions and top spiral coils',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null, // Nullable: Pricing confirmed via WhatsApp
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Lavender Bloom Pocket Diary | Floral Collection | CUMID',
    seoDescription: 'Lavender Bloom square pocket diary with top spiral binding by CUMID. Purple florals, crescent moon design preview. Enquire for the next batch on WhatsApp.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For night owls, gentle dreamers, and lovers of botanical stillness.',
  },
  {
    id: 'CUMID-HG-001',
    slug: 'kal-se-productive',
    name: 'Kal Se Productive',
    tagline: 'The universal Indian promise to start tomorrow.',
    shortDescription: 'A witty Hinglish clock concept capturing our eternal, relatable pledge to conquer procrastination from tomorrow morning.',
    longDescription: 'Every notebook promises a fresh start; Kal Se Productive acknowledges the reality with a grin. Featuring a playful melting clock graphic and bold bilingual typography, this pocket diary is for everyone who writes down ambitious daily to-do lists and happily reschedules them for tomorrow.',
    collection: 'hinglish',
    collectionName: 'Hinglish',
    images: [
      {
        src: '/products/kal-se-productive/cover.svg',
        alt: 'Kal Se Productive square pocket diary cover with witty clock illustration and Hinglish typography',
        isPrimary: true,
      },
      {
        src: '/products/kal-se-productive/mockup.svg',
        alt: 'Design preview of Kal Se Productive square diary with top-edge spiral binding',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null,
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Kal Se Productive Pocket Diary | Hinglish Humour | CUMID',
    seoDescription: 'Kal Se Productive square pocket diary with top spiral binding. Witty desi humour and clock concept cover. Preorder enquiry on WhatsApp.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For ambitious planners who take life one postponed to-do at a time.',
  },
  {
    id: 'CUMID-CT-001',
    slug: 'low-battery',
    name: 'Low Battery',
    tagline: 'Quietly recharging in a high-demand world.',
    shortDescription: 'A soft peach background featuring an endearing low-battery icon reminding you that rest is just as productive as work.',
    longDescription: 'Low Battery is an honest ode to modern burnout and gentle recovery. Drenched in soft peach tones with minimalist illustrative line art, this diary serves as a safe container for brain dumps, gentle checklists, or simply scribbling when social energy is at 2%.',
    collection: 'cute',
    collectionName: 'Cute',
    images: [
      {
        src: '/products/low-battery/cover.svg',
        alt: 'Low Battery square pocket diary cover in soft peach with cute recharging battery illustration',
        isPrimary: true,
      },
      {
        src: '/products/low-battery/mockup.svg',
        alt: 'Design preview of Low Battery pocket diary with top spiral coil binding',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null,
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Low Battery Pocket Diary | Cute Collection | CUMID',
    seoDescription: 'Low Battery square pocket diary with top spiral binding by CUMID. Dusty peach palette and cute battery motif. Sold out — WhatsApp preorder enquiries open.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For introverts, over-thinkers, and anyone on 1% battery needing a calm pause.',
  },
  {
    id: 'CUMID-CT-002',
    slug: 'complicated-thoughts',
    name: 'Complicated Thoughts',
    tagline: 'A curious cat untangling a yarn ball of ideas.',
    shortDescription: 'A thoughtful cat surrounded by squiggly yarn lines, celebrating tangled, brilliant, messy internal monologues.',
    longDescription: 'Our best thoughts rarely emerge in straight lines. Complicated Thoughts features an inquisitive illustrated cat wrestling with playful yarn coils. Designed to accept raw brainstorming, mind maps, and half-formed epiphanies without judgment.',
    collection: 'cute',
    collectionName: 'Cute',
    images: [
      {
        src: '/products/complicated-thoughts/cover.svg',
        alt: 'Complicated Thoughts square pocket diary cover with illustrated cat playing with yarn ball and thoughts',
        isPrimary: true,
      },
      {
        src: '/products/complicated-thoughts/mockup.svg',
        alt: 'Design preview of Complicated Thoughts square diary showing top spiral binding',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null,
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Complicated Thoughts Pocket Diary | Cute Collection | CUMID',
    seoDescription: 'Complicated Thoughts square pocket diary by CUMID. Whimsical cat and yarn illustration with top spiral binding. Enquire for next batch.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For curious minds with twenty tabs open in their head.',
  },
  {
    id: 'CUMID-CJ-001',
    slug: 'grounded-temporarily',
    name: 'Grounded, Temporarily',
    tagline: 'Patience on the tarmac before the next climb.',
    shortDescription: 'Minimalist supersonic jet blueprint silhouette on deep charcoal, capturing runway focus and imminent takeoff.',
    longDescription: 'Grounded, Temporarily speaks to periods of preparation, skill refinement, and patience before launching your next venture. The stark charcoal cover features clean aeronautical vector geometry and subtle flight path markings.',
    collection: 'cars-and-jets',
    collectionName: 'Cars & Jets',
    images: [
      {
        src: '/products/grounded-temporarily/cover.svg',
        alt: 'Grounded Temporarily square pocket diary cover with minimalist jet silhouette and aeronautical coordinates',
        isPrimary: true,
      },
      {
        src: '/products/grounded-temporarily/mockup.svg',
        alt: 'Design preview of Grounded Temporarily pocket diary with top spiral binding',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null,
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Grounded Temporarily Pocket Diary | Cars & Jets | CUMID',
    seoDescription: 'Grounded Temporarily square pocket diary with top spiral binding by CUMID. Minimalist jet blueprint design preview. Sold out — enquire on WhatsApp.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For engineers, aviation enthusiasts, and founders gearing up for takeoff.',
  },
  {
    id: 'CUMID-CJ-002',
    slug: 'plans-in-overdrive',
    name: 'Plans in Overdrive',
    tagline: 'Fast lines, open highways, and redlined ambition.',
    shortDescription: 'Dynamic sports car telemetry line art and rev-counter accents for people whose ideas move at 7,000 RPM.',
    longDescription: 'Built for fast thinkers and high-momentum days. Plans in Overdrive features aerodynamic curves, racing tachometer contours, and sharp typography. Whether sketching blueprints or mapping project sprints, the top spiral keeps pages turning at full speed.',
    collection: 'cars-and-jets',
    collectionName: 'Cars & Jets',
    images: [
      {
        src: '/products/plans-in-overdrive/cover.svg',
        alt: 'Plans in Overdrive square pocket diary cover with dynamic car telemetry and tachometer vector lines',
        isPrimary: true,
      },
      {
        src: '/products/plans-in-overdrive/mockup.svg',
        alt: 'Design preview of Plans in Overdrive pocket diary with top spiral coil binding',
      },
    ],
    isDesignPreview: true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: null,
    currency: 'INR',
    isSoldOut: true,
    availabilityStatus: 'SoldOut',
    whatsappEnquiryEnabled: true,
    seoTitle: 'Plans in Overdrive Pocket Diary | Cars & Jets | CUMID',
    seoDescription: 'Plans in Overdrive square pocket diary with top spiral binding. High-octane automotive typography and telemetry design preview.',
    lastMeaningfulUpdate: '2026-10-15',
    personalityNote: 'For adrenaline junkies, night drivers, and those who brainstorm in overdrive.',
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCollection(collectionSlug: string): Product[] {
  return PRODUCTS.filter((p) => p.collection === collectionSlug);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.slice(0, 6);
}
