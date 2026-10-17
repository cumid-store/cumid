import type { Collection } from '../types/collection';

export const COLLECTIONS: Record<string, Collection> = {
  floral: {
    id: 'floral',
    slug: 'floral',
    name: 'Floral',
    headline: 'Soft blossoms, botanical pauses, and midnight blooms.',
    description: 'Designed for quiet moments, reflective journaling, and those who find solace in garden greens and twilight petals.',
    personalityPill: 'Calm & Botanical',
    themeColor: '#75806D',
    accentBg: '#F4F6F3',
    metaTitle: 'Floral Pocket Diaries | CUMID Stationery',
    metaDescription: 'Explore CUMID square pocket diaries with top-spiral binding featuring floral artwork, botanical illustrations, and twilight petals. All designs currently sold out — preorder enquiry on WhatsApp.',
  },
  cute: {
    id: 'cute',
    slug: 'cute',
    name: 'Cute',
    headline: 'Relatable companions, cozy quirks, and gentle humour.',
    description: 'Everyday comforts for overthinkers, low-battery mornings, and cat-lovers who appreciate whimsical, heartwarming designs.',
    personalityPill: 'Playful & Comforting',
    themeColor: '#9E745C',
    accentBg: '#FBF8F5',
    metaTitle: 'Cute Pocket Diaries | CUMID Stationery',
    metaDescription: 'Whimsical, relatable square pocket diaries by CUMID with top spiral binding. Low battery themes, sleepy cats, and pocket comforts. Preorder enquiries via WhatsApp.',
  },
  hinglish: {
    id: 'hinglish',
    slug: 'hinglish',
    name: 'Hinglish',
    headline: 'Witty banter, daily ironies, and desi reality checks.',
    description: 'For the ones balancing hustle and procrastinating until tomorrow. Tongue-in-cheek quotes that capture Indian daily truths.',
    personalityPill: 'Witty & Relatable',
    themeColor: '#6B5B84',
    accentBg: '#F6F4F9',
    metaTitle: 'Hinglish Humour Pocket Diaries | CUMID Stationery',
    metaDescription: 'Bilingual Hinglish pocket diaries by CUMID. Relatable desi work-life banter and sharp typography in a compact top-spiral square diary.',
  },
  'cars-and-jets': {
    id: 'cars-and-jets',
    slug: 'cars-and-jets',
    name: 'Cars and Jets',
    headline: 'Machinery in motion, runway focus, and high-altitude drive.',
    description: 'For lovers of velocity, aviation blueprints, and road trips that refuse to slow down. Crisp mechanical aesthetics.',
    personalityPill: 'Kinetic & Driven',
    themeColor: '#33302D',
    accentBg: '#F5F5F5',
    metaTitle: 'Cars & Jets Pocket Diaries | CUMID Stationery',
    metaDescription: 'High-octane aviation and automotive themed square pocket diaries by CUMID with top spiral binding. Fast plans, grounded moments, and bold cover art.',
  },
};

export const COLLECTION_LIST: Collection[] = Object.values(COLLECTIONS);
