# CUMID (cumid.store) — Store Owner Operations Manual

Welcome to your CUMID storefront! Everything is engineered with **central configuration and typed datasets** so you can update products, prices, images, and WhatsApp settings without digging through HTML or component code.

---

## 1. How to Update WhatsApp Details
All customer-facing WhatsApp links across the entire website are controlled in one central file:
**File**: `src/config/site.ts`

```typescript
export const SITE = {
  // Update these two fields if your business phone number changes:
  whatsappNumber: '919201871597',         // International format without +, spaces or dashes
  whatsappDisplayNumber: '+91 9201871597', // User-facing display format
  whatsappBaseUrl: 'https://wa.me/919201871597',
  ...
};
```
Once saved and deployed, every button, header link, fallback message, and footer reference updates automatically.

---

## 2. How to Add a New Pocket Diary
All catalog products are defined in `src/data/products.ts`.

1. Open `src/data/products.ts`.
2. Add a new product object to the `PRODUCTS` array:
```typescript
{
  id: 'CUMID-FL-002',
  slug: 'midnight-jasmine',
  name: 'Midnight Jasmine',
  tagline: 'Delicate white petals under indigo shadows.',
  shortDescription: 'Night-blooming jasmine flowers with silver celestial accents.',
  longDescription: 'Detailed background story explaining the cover mood...',
  collection: 'floral', // Must match: 'floral' | 'cute' | 'hinglish' | 'cars-and-jets'
  collectionName: 'Floral',
  images: [
    {
      src: '/products/midnight-jasmine/cover.svg',
      alt: 'Midnight Jasmine square pocket diary cover with top spiral binding',
      isPrimary: true,
    },
  ],
  isDesignPreview: true,
  confirmedSpecs: {
    format: 'Square pocket diary',
    binding: 'Spiral binding along top edge',
    orientation: 'Top-flip notebook format',
  },
  price: null, // Keep null for "Pricing will be confirmed on WhatsApp", or set number e.g. 299
  currency: 'INR',
  isSoldOut: true,
  availabilityStatus: 'SoldOut',
  whatsappEnquiryEnabled: true,
  seoTitle: 'Midnight Jasmine Pocket Diary | Floral | CUMID',
  seoDescription: 'Midnight Jasmine square pocket diary with top spiral binding.',
  lastMeaningfulUpdate: '2026-10-20',
  personalityNote: 'For night thinkers and lovers of quiet fragrant evenings.',
}
```
3. Place your artwork file in `public/products/midnight-jasmine/cover.svg`.
4. Run `npm run build:quick` to verify. A dedicated product page `/products/midnight-jasmine` and sitemap entry are automatically generated!

---

## 3. How to Replace a Cover Image
1. Prepare your clean square artwork (`.svg`, `.webp`, or `.png`).
2. Save it to `public/products/[product-slug]/cover.svg`.
3. In `src/data/products.ts`, ensure `images[0].src` points to the new file path and update the `alt` description.
4. If it's a real photograph of manufactured stock rather than a concept rendering, change `isDesignPreview: false` to remove the "Design preview" badge.

---

## 4. How to Edit Copy & Personality Descriptions
- **Product copy**: Edit `name`, `tagline`, `shortDescription`, `longDescription`, and `personalityNote` in `src/data/products.ts`.
- **Theme copy**: Edit collection headlines and descriptions in `src/data/collections.ts`.
- **Journal articles**: Add or edit blog posts in `src/data/journal.ts`.
- **FAQ answers**: Add or edit questions and answers in `src/data/faq.ts`.

---

## 5. How to Change Availability (From Sold Out to Ready Stock)
When a batch is produced and you have ready stock:
1. In `src/data/products.ts`, locate the product.
2. Change `isSoldOut: false`.
3. Set `availabilityStatus: 'InStock'`.
4. Enter confirmed unit price: `price: 299`.
5. In `src/config/launch.ts`, adjust `CATALOG_SOLD_OUT: false` if opening multiple designs.

---

## 6. How to Review Analytics
- **Fast aggregate traffic**: Open Cloudflare Dashboard > **Web Analytics**. View total visits, top referrers, and Core Web Vitals.
- **Preorder interest**: Open Google Analytics 4 > **Reports > Engagement > Events**. Look for `whatsapp_preorder_click` and filter by `item_id`.

---

## 7. How to Process Privacy & Account Requests
When a customer sends a privacy or deletion request on WhatsApp:
- **If they have a Google account**: They can click "Delete my account permanently" on their `/account` screen.
- **Manual deletion**: Open Supabase Dashboard > **Authentication > Users**. Locate the email address, click the three dots, and select **Delete user**. All linked database rows in `profiles` and `favourites` delete automatically via database cascade.

---

## 8. How to Deploy an Update
Whenever you make changes to files:
1. Test your build locally:
   ```bash
   npm run build:quick
   ```
2. Commit your changes to Git:
   ```bash
   git add .
   git commit -m "Update product copy and WhatsApp number"
   git push origin main
   ```
3. Cloudflare Pages detects the push, runs the build in ~20 seconds, and publishes the update globally.
