/**
 * CUMID Store — Journal Article Type Definition
 */

export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedDate: string; // ISO date string e.g. "2026-10-10"
  updatedDate: string;
  author: {
    name: string;
    role: string;
  };
  featuredImage: {
    src: string;
    alt: string;
  };
  content: string; // Markdown or rich HTML body
  relatedProductSlugs: string[];
  seoTitle: string;
  seoDescription: string;
}
