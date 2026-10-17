# CUMID (cumid.store) — Owner Input & Pre-Launch Decision Checklist

> [!IMPORTANT]
> **Strict Policy**: To protect the brand’s legal standing and consumer trust, this codebase contains **zero fabricated specifications, zero fake founder stories, and zero placeholder corporate identities**.
> The items below represent **launch blockers** requiring confirmed owner input before public marketing commencement. The website operates in safe, enquiry-only mode until these decisions are finalized.

---

## 1. Legal Identity & Regulatory Disclosures (India)

| Requirement | Current Storefront State | Owner Action Required | Launch Blocker? |
| :--- | :--- | :--- | :--- |
| **Legal Business Entity Name** | Displayed as brand trade name "CUMID" | Provide registered Sole Proprietorship / LLP / Private Limited company name. | **YES** |
| **Registered Business Address** | Omitted publicly | Provide physical registered office address in India for legal footer & privacy policy. | **YES** |
| **GSTIN Registration** | Omitted | Provide GSTIN (if turnover threshold is reached or registered). | Low (if exempt) |
| **Official Corporate Email** | Omitted (customers directed to verified WhatsApp +91 7023987458) | Provide monitored domain email (e.g. `hello@cumid.store` or `contact@cumid.store`) when mail hosting is activated. | Medium |
| **Grievance Officer (DPDP Act)** | Customer WhatsApp contact designated | Nominate designated Grievance Officer name and contact email/phone under Indian DPDP Act provisions. | **YES** |

---

## 2. Product Specifications & Pricing Confirmations

| Requirement | Current Storefront State | Owner Action Required | Launch Blocker? |
| :--- | :--- | :--- | :--- |
| **Cover Dimensions (mm)** | Listed as "Square pocket format" | Confirm exact width & height in mm (e.g. $105 \times 105$ mm or $120 \times 120$ mm). | Medium (shared via WhatsApp) |
| **Paper Weight (GSM)** | Omitted | Confirm inner text paper GSM (e.g. 80 GSM, 100 GSM, or 120 GSM) and paper type (natural shade / ivory / dotted / blank). | Medium |
| **Page / Leaf Count** | Omitted | Confirm total sheet / page count per diary. | Medium |
| **Unit Selling Price (INR)** | "Pricing will be confirmed on WhatsApp" | Confirm unit MRP and batch introductory price per design. | Medium (can remain enquiry-based) |
| **Binding Finish & Wire Specs** | Listed as "Spiral binding along top edge" | Confirm wire-o colour (black / bronze / silver) and ring pitch. | Low |
| **Cover Board Thickness** | Listed as "Design preview" | Confirm cover substrate (e.g. 350 GSM artcard, matte laminated rigid board). | Low |

---

## 3. Operations, Shipping & Logistics

| Requirement | Current Storefront State | Owner Action Required | Launch Blocker? |
| :--- | :--- | :--- | :--- |
| **Courier / Logistics Partner** | Listed as pan-India dispatch on WhatsApp | Confirm courier aggregator (e.g. Shiprocket, Delhivery, India Post). | Medium |
| **Standard Delivery SLA** | Listed as batch-based schedule | Confirm standard transit timeline (e.g. 4–7 business days). | Medium |
| **Return Window** | 48-hour transit damage replacement policy | Confirm whether change-of-mind returns are accepted or replacement-only for damaged goods. | Medium |

---

## 4. Third-Party Credentials & Service Keys

| Service | Environment Variable | Current State | Setup Guide Reference |
| :--- | :--- | :--- | :--- |
| **Supabase URL** | `PUBLIC_SUPABASE_URL` | Unset (local fallback active) | [docs/OAUTH_SETUP_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/OAUTH_SETUP_GUIDE.md) |
| **Supabase Anon Key** | `PUBLIC_SUPABASE_ANON_KEY` | Unset (local fallback active) | [docs/OAUTH_SETUP_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/OAUTH_SETUP_GUIDE.md) |
| **Google OAuth Client ID** | Supabase Dashboard Provider | Unset | [docs/OAUTH_SETUP_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/OAUTH_SETUP_GUIDE.md) |
| **Google Analytics 4** | `PUBLIC_GA4_MEASUREMENT_ID` | Optional (empty) | [docs/ANALYTICS_EVENT_DICTIONARY.md](file:///c:/Ankshit/cumid.store/docs/ANALYTICS_EVENT_DICTIONARY.md) |
| **Cloudflare Analytics Token** | `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`| Optional (empty) | [docs/DEPLOYMENT_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/DEPLOYMENT_GUIDE.md) |

---

## 5. Verification Checklist Before First Paid Transaction
- [ ] Registered business entity documented in `/privacy` and `/terms`.
- [ ] Product dimensions and GSM tested on physical prototypes.
- [ ] WhatsApp business profile configured with official catalog images.
- [ ] Bank account / UPI verified for receiving manual preorder payments on WhatsApp.
- [ ] Packaging test: ensure top spiral does not bend in protective transit sleeves.
