/**
 * CUMID Store — Collection Type Definition
 */

import type { CollectionSlug } from './product';

export interface Collection {
  id: CollectionSlug;
  slug: CollectionSlug;
  name: string;
  headline: string;
  description: string;
  personalityPill: string;
  themeColor: string;
  accentBg: string;
  metaTitle: string;
  metaDescription: string;
}
