# Local update — 17 October 2026

13 cover designs imported from the original catalogue; 4 minimal options retained in galleries. The storefront now uses an editorial product grid and Notebook Bird branding. All designs remain sold out; WhatsApp enquiry links are active.

Use Node 24. Run `npm ci`, `npm run build`, then `npm run preview`. `npm test` builds a separate `dist-e2e` using fake public integration settings and mocked service responses. Tests use an isolated static server on port 4322; your regular preview can stay open. Publish only `dist`; the build generates CSP hashes. Do not publish `dist-e2e`.

See `docs/LAUNCH_CHECKLIST.md` for remaining owner/provider setup and `docs/TEST_RESULTS.md` for verified scope. Original artwork provenance: `docs/CATALOGUE_SOURCES.json`. Import script source paths refer to this workstation and are not needed for ordinary builds.

---

# CUMID — cumid.store

> **Indian Personality Stationery Brand**  
> Square pocket diaries with spiral binding along the top edge.  
> Calm, thoughtful, playful, and professional.

Canonical Production URL: [https://cumid.store](https://cumid.store)  
Customer WhatsApp Preorder Desk: [+91 9201871597](https://wa.me/919201871597)  
Current Status: **All products sold out · Batch preorder enquiries accepted via WhatsApp**

---

## Technical Stack & Architecture

- **Core**: [Astro](https://astro.build/) (Static Site Generation static HTML with React islands for interactive controls)
- **Interactive Islands**: [React](https://react.dev/) (Auth, Favourites drawer, Analytics consent banner, WhatsApp copy fallback)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom warm ivory design tokens (`#F7F4EF`, `#252321`, `#62537D`, `#929C8A`, `#DFC3B2`)
- **Hosting & CDN**: Cloudflare Pages Free Tier
- **Authoritative DNS**: Cloudflare DNS Free Tier (Namecheap as Registrar)
- **Database & Auth**: Supabase Free Tier (Google OAuth with PKCE, Row-Level Security, separate guest and account favourites)
- **Analytics**:
  - Aggregate: Cookieless Cloudflare Web Analytics
  - Marketing: Google Analytics 4 (strict basic consent mode, zero scripts loaded before affirmative opt-in)
- **Testing**: Playwright automated integration & E2E suite

---

## Project Structure

```
cumid.store/
├── public/
│   ├── brand/               # Master SVG logos, wordmarks, favicon, OG cards
│   ├── products/            # WebP artwork and mockup previews
│   ├── _headers             # Cloudflare Pages edge security headers (CSP, HSTS)
│   ├── robots.txt           # Crawl directives (disallowing private routes)
│   ├── site.webmanifest     # Progressive web app manifest
│   └── llms.txt             # Experimental context for AI crawlers
├── src/
│   ├── components/
│   │   ├── AnnouncementBanner.astro
│   │   ├── Breadcrumbs.astro
│   │   ├── FAQAccordion.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── HowEnquiriesWork.astro
│   │   ├── PersonalityGrid.astro
│   │   ├── ProductAnatomy.astro
│   │   ├── ProductCard.astro
│   │   ├── StructuredData.astro
│   │   └── islands/         # Isolated React components
│   │       ├── AccountView.tsx
│   │       ├── AnalyticsConsentBanner.tsx
│   │       ├── FavouritesButton.tsx
│   │       ├── FavouritesList.tsx
│   │       ├── MobileNavDrawer.tsx
│   │       └── WhatsAppPreorderButton.tsx
│   ├── config/              # Central site facts, launch switches, analytics
│   ├── data/                # Typed products, collections, journal, and FAQs
│   ├── layouts/             # BaseLayout with SEO schemas and styles
│   ├── lib/                 # Supabase client and privacy analytics controller
│   ├── pages/               # File-based static routing (29 routes)
│   └── types/               # TypeScript interfaces
├── supabase/
│   └── migrations/          # SQL schema, RLS policies, and deletion RPC
├── docs/                    # Complete operational and deployment documentation
│   ├── BRAND_GUIDELINES.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── OAUTH_SETUP_GUIDE.md
│   ├── FREE_TIER_QUOTAS.md
│   ├── ANALYTICS_EVENT_DICTIONARY.md
│   ├── OWNER_INPUT_CHECKLIST.md
│   ├── BACKUP_AND_RECOVERY.md
│   ├── LAUNCH_CHECKLIST.md
│   └── STORE_OWNER_MANUAL.md
├── tests/
│   └── cumid.spec.ts        # Comprehensive Playwright test suite
└── dist/                    # Static production output
```

---

## Quickstart & Local Development

### 1. Prerequisites
- Node.js `v20` or higher
- npm `v10` or higher

### 2. Installation
```bash
git clone <your-repo-url>
cd cumid.store
npm install
```

### 3. Environment Setup (Optional)
Copy the template configuration:
```bash
cp .env.example .env
```
*(The storefront functions 100% in guest mode with local favourites and WhatsApp links even if `.env` is empty).*

### 4. Running the Dev Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 5. Running Static Production Build
```bash
npm run build:quick
npm run preview
```

### 6. Running Automated Tests
```bash
npx playwright install chromium # if browser binary is needed
npm test
```

---

## Documentation Quick Links
- **Deploying to Cloudflare**: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- **Owner Launch Checklist**: [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)
- **Store Operations Manual**: [docs/STORE_OWNER_MANUAL.md](docs/STORE_OWNER_MANUAL.md)
- **Brand & Logo Guidelines**: [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md)
- **Free Tier Quotas & Monitoring**: [docs/FREE_TIER_QUOTAS.md](docs/FREE_TIER_QUOTAS.md)
- **Analytics Event Dictionary**: [docs/ANALYTICS_EVENT_DICTIONARY.md](docs/ANALYTICS_EVENT_DICTIONARY.md)
- **Google OAuth Setup**: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)
- **Manual Backups**: [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md)
