# CUMID (cumid.store) — Privacy-First Analytics Event Dictionary

This document details the dual-layer analytics architecture, basic consent mode gating, tracked events, sanitized parameters, prohibited data types, and GA4 dashboard setup instructions.

---

## 1. Dual-Layer Architecture

### Layer 1: Aggregate Performance (Cloudflare Web Analytics)
- **Engine**: Cookieless, server-edge aggregate measurement.
- **Data Collected**: Page load durations, Core Web Vitals (LCP, CLS, INP), request counts, aggregate geography (country-level), browser types.
- **Privacy Standard**: No persistent cookies, no cross-device tracking, no user profiling. Enabled by default for uptime monitoring.

### Layer 2: Optional Marketing Events (Google Analytics 4)
- **Gating**: **Strict Basic Consent Mode**. No GA4 scripts (`gtag.js`), network pings, or cookies are loaded until the visitor affirmatively clicks *"Accept analytics"*.
- **Signals & Ads**: Google Signals is disabled (`allow_google_signals: false`), ad personalization is disabled (`allow_ad_personalization_signals: false`), and IP addresses are anonymized.

---

## 2. Tracked Events Dictionary

All approved events and their allowable parameters:

| Event Name | Trigger Condition | Permitted Parameters | Privacy Purpose |
| :--- | :--- | :--- | :--- |
| `view_item_list` | Visitor views catalog or collection page | `item_category`, `sanitized_path` | Measures collection interest |
| `select_item` | Visitor clicks a product card link | `item_id`, `item_category` | Tracks card click-through rate |
| `view_item` | Visitor lands on `/products/[slug]` | `item_id`, `item_category`, `sanitized_path` | Measures individual cover views |
| `collection_filter` | Visitor switches collection filter pill | `filter_value` | Evaluates theme popularity |
| `add_to_wishlist` | Visitor clicks heart icon to save cover | `item_id` | Gauges user intent and design affinity |
| `remove_from_wishlist` | Visitor un-favourites a saved cover | `item_id` | Tracks wishlist revisions |
| `whatsapp_preorder_click` | Visitor clicks WhatsApp preorder button | `item_id`, `cta_placement` | **Intent Only**: Tracks intent to enquire on WhatsApp. Never labelled as sale or lead. |
| `faq_expand` | Visitor expands an FAQ item | `faq_id` | Identifies customer clarity questions |

---

## 3. Strict Parameter Whitelist & Sanitization

Only the following attributes are permitted in event payloads:
- `item_id`: Stable reference string (e.g. `CUMID-FL-001`)
- `item_category`: Theme identifier (`floral`, `cute`, `hinglish`, `cars-and-jets`)
- `cta_placement`: UI location (`hero`, `featured_grid`, `product_gallery`, `product_detail`, `footer`, `nav`, `faq`)
- `sanitized_path`: Clean URL pathname without query strings or hashes (e.g. `/products/lavender-bloom`)
- `filter_value`: Filter identifier
- Approved Campaign Parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

### Prohibited Data Payloads (Never Sent to GA4)
The implementation enforces strict programmatic omissions:
- ❌ **No Names, Emails, or Phone Numbers**
- ❌ **No Account IDs or Supabase UUIDs**
- ❌ **No Shipping or Street Addresses**
- ❌ **No WhatsApp Message Text** (only the product ID is passed; pre-filled chat messages are never sent to Google)
- ❌ **No Form Inputs or Keystrokes**
- ❌ **No Session Replays, Mouse Heatmaps, or Fingerprinting**
- ❌ **No Unsanitized Full URLs with Arbitrary Query Strings**

---

## 4. GA4 Exploration & Dashboard Setup Guide

For the store owner to analyze preorder performance in the Google Analytics interface:

### Report 1: Product Interest vs. WhatsApp Enquiries
1. Navigate to **Explore > Blank Exploration**.
2. **Dimensions**: Add `Item ID` and `Item category`.
3. **Metrics**: Add `Item views`, `Add to wishlists`, and `Event count` (filtered by Event name = `whatsapp_preorder_click`).
4. **Calculated Metric (Enquiry Rate)**:
   $$\text{Preorder Intent Rate} = \frac{\text{whatsapp\_preorder\_click Count}}{\text{Item Views}}$$

### Report 2: Traffic Source / Medium for Preorders
1. Create a **Free-form exploration**.
2. **Dimensions**: `Session source / medium`, `Campaign`.
3. **Metrics**: `Active users`, `whatsapp_preorder_click`.
4. Observe which social or direct channels generate WhatsApp conversations.

### Report 3: Core Web Vitals & Real-User Performance
1. In Cloudflare Dashboard, go to **Web Analytics > Web Vitals**.
2. Review 75th percentile LCP, CLS, and INP metrics across mobile and desktop.

### Important Data Limitation Notice
- Ad blockers (e.g., uBlock Origin, Brave) and privacy-conscious users who select *"Reject optional analytics"* do not report to GA4.
- Typical GA4 coverage represents **50% to 80%** of actual visitor traffic. Never treat GA4 event counts as exact accounting ledgers.
