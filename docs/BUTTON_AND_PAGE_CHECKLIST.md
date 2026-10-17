# CUMID (cumid.store) — Button & Page Interaction Checklist

This document catalogs every interactive button, link, and state machine action across mobile and desktop viewports, with required behavior, loading states, duplicate-click guards, error handling, and empty states.

---

## 1. Global Navigation & Header Controls

| Control | Location | Required Behaviour | Loading & Feedback | Duplicate Guard | Error Handling | Empty / Fallback State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Logo Lockup** | Header (All pages) | Navigates to `/` (Homepage) | Instant client-side / static link | Native browser debouncing | Not applicable | Replaces with text alt if image fails |
| **Shop Nav Link** | Desktop Header / Mobile Drawer | Navigates to `/shop` (Full 13 covers) | Instant link navigation | Native link debouncing | HTTP 404 page | Shows full catalog grid |
| **Collections Nav Link** | Desktop Header / Mobile Drawer | Anchors to `#collections` or `/collections/*` | Smooth scroll / route change | Native link debouncing | Redirects to `/shop` | Filter pills for 5 themes |
| **Favourites Header Icon** | Desktop & Mobile Header | Navigates to `/account/favourites` | Counter badge updates dynamically | Native link debouncing | Graceful local storage read | Empty state illustration with "Browse covers" CTA |
| **Account Header Icon** | Desktop Header / Mobile Drawer | Navigates to `/account` portal | Shows active session avatar or user icon | Native link debouncing | Displays friendly sign-in screen if unauthenticated | Shows guest mode disclosure |
| **Header WhatsApp Action** | Desktop Header / Mobile Drawer | Opens WhatsApp with general enquiry | Direct `<a>` with `target="_blank"` | Native debouncing | Displays fallback copy button | Prompts manual phone number dial |
| **Mobile Drawer Hamburger** | Mobile Viewports (< 768px) | Expands / collapses accessible slide-over drawer | Smooth CSS transform; trap focus | Debounced toggle | Drawer closes on Escape key | All nav links visible |

---

## 2. Product Detail & Preorder Enquiry Controls

| Control | Location | Required Behaviour | Loading & Feedback | Duplicate Guard | Error Handling | Empty / Fallback State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Quantity Selector (- / +)** | `/products/[slug]` | Decreases / increases units (1 to 10) | Live number display updates in DOM | Min 1, max 10 disabled buttons | Clamped to [1, 10] integer range | Default quantity = 1 |
| **Preorder WhatsApp CTA** | `/products/[slug]` | Opens pre-composed WhatsApp link with product name, reference ID, quantity, and URL | Immediate link activation; logs enquiry in background | 2-second click throttle prevents duplicate clicks | Wrapped in strict `try/catch`; WhatsApp ALWAYS opens even if analytics/logging fails | Fallback copy button displays exact message text |
| **Copy Pre-composed Message** | `/products/[slug]` | Copies message text to system clipboard | Button changes to green checkmark "Copied message!" for 3s | Debounced click handler | Falls back to standard `window.prompt` if clipboard API unavailable | Shows clear copyable string |
| **Support Email Link** | `/products/[slug]`, Footer, How Preorders Work | Opens `mailto:support@cumid.store` with pre-filled subject | Native mail client launcher | Native debouncing | Dedicated "Copy email" button next to link | Copies `support@cumid.store` |
| **Save Favourite Heart** | Product Card / Product Page | Saves product ID to local storage & syncs to Supabase | Heart fills peach with scale micro-animation; badge updates | Debounced async toggle | Reverts UI state and warns gracefully if network fails | Retains local storage as offline ground truth |
| **Gallery Thumbnail** | `/products/[slug]` | Swaps primary image display | Border highlight on active thumbnail | Immediate DOM state change | Graceful image fallback | First primary image shown |

---

## 3. Customer Account & Order Controls

| Control | Location | Required Behaviour | Loading & Feedback | Duplicate Guard | Error Handling | Empty / Fallback State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Sign-In Button** | `/account` | Initiates Supabase PKCE OAuth with minimal scopes | Spinner on button during redirect | Disabled while redirect initiates | Descriptive error box if pop-up blocked or cancelled | Guest mode disclosure with offline favourites |
| **Import Guest Favourites** | `/account`, `/account/favourites` | Merges local browser favourites into authenticated account | "Importing..." spinner; success notification | Button disabled once imported | Error alert if network failure occurs | Hidden if no guest favourites exist |
| **Sign Out Button** | `/account` | Clears active session and local user state | Clears profile state immediately | Single action | Resets session to guest | Clean guest portal view |
| **Delete Account Button** | `/account` | Confirms intent, calls server RPC to delete account | "Deleting..." state; disables button | Requires explicit `window.confirm` dialog | Explains manual WhatsApp deletion request if RPC unconfigured | Success message explaining separate WhatsApp chats |
| **View Order Details** | `/account/orders` | Opens `/account/orders/[id]` | Route navigation to order details | Native link debouncing | Displays "Order not found" if ID invalid | "No orders placed yet" screen with link to shop |
| **Request Order Cancellation** | `/account/orders/[id]` | Opens cancellation request modal | "Submitting..." spinner on button | Form submit disabled during execution | Red error banner if submission fails | Explains cancellation rules if order already dispatched |
| **Order Help WhatsApp** | `/account/orders/[id]` | Opens WhatsApp with prefilled order number | Direct accessible `<a>` link | Native debouncing | Fallback to email link | Direct conversation |

---

## 4. Private Admin Dashboard Controls

| Control | Location | Required Behaviour | Loading & Feedback | Duplicate Guard | Error Handling | Empty / Fallback State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Order Draft** | `/admin/orders` | Opens modal to create agreed WhatsApp order with item snapshot & address | Modal opens; auto-calculates total in paise | Disabled submit while saving | Form validation errors displayed above buttons | Form resets cleanly after save |
| **Order Status Dropdown** | `/admin/orders` | Updates status: draft → in production → ready → dispatched → delivered | Instant dropdown update; logs audit event | Immediate optimistic change with rollback on error | Error banner if database write rejected | Defaults to current status |
| **Assign Tracking Details** | `/admin/orders` | Modal to input courier carrier and consignment number | "Saving..." state; updates order to dispatched | Disabled while saving | Requires non-empty tracking number | "Tracking assigned upon batch dispatch" |
| **Enquiry Status Dropdown** | `/admin/enquiries` | Updates inquiry: new → contacted → quoted → converted → closed | Instant status badge change | Single select mutation | Rollback on network failure | Shows current status |
| **Enquiry Note Editor** | `/admin/enquiries` | Inline textarea to record WhatsApp conversation details | "Save Note" button with instant update | Button disabled while saving | Alerts if save fails | "No notes recorded" placeholder |
| **Product Price & Status** | `/admin/products` | In-place editor for price in rupees (paise), sold out, and published toggles | Highlights unsaved drafts in amber | Immediate toggle | Reverts on error | "On WhatsApp" if price null |
| **Publish Catalogue Changes** | `/admin/products` | Pushes staged draft pricing/status to live storefront build | Spinner with "Publishing to Edge..."; green success notification | Button disabled unless unpublished changes exist | Displays exact edge error if build fails | "Storefront in sync" pill |
| **Create Production Batch** | `/admin/batches` | Creates new batch run with target quantity and dispatch date | "Saving..." state; modal closes on success | Disabled while saving | Field validation for positive target quantity | "No production runs yet" empty state |
| **Save Store Settings** | `/admin/settings` | Updates support WhatsApp, email, shipping fees, and DPDP retention days | "Saving Settings..." spinner; green success banner | Single submit handler | Validation for required email/phone format | Loads default store configuration |

---

## 5. Privacy, Policy & Consent Controls

| Control | Location | Required Behaviour | Loading & Feedback | Duplicate Guard | Error Handling | Empty / Fallback State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Accept Analytics** | Bottom Consent Banner | Grants consent; loads GA4 Basic Consent mode | Banner dismisses immediately with slide-down animation | Single click listener | Defaults to denied if error | Consent banner hidden |
| **Reject Optional Analytics** | Bottom Consent Banner | Sets denied; strictly suppresses GA4 scripts & cookies | Banner dismisses immediately; zero tracking calls | Single click listener | Re-confirms denied state in storage | Complete site functional |
| **Persistent Cookie Preferences** | Global Footer | Re-opens privacy preference modal at any time | Modal appears smoothly | Debounced modal trigger | Native dialog fallback | Allows changing choice anytime |
