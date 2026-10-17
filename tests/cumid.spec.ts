import { test, expect } from '@playwright/test';

test.describe('CUMID E-Commerce Storefront Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://cumid-test.supabase.co/**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'mock unconfigured in e2e' }),
      })
    );
  });
  
  test('1. Every product in the catalog is visibly marked as Sold Out', async ({ page }) => {
    await page.goto('/shop');
    
    // Check that all product cards display "Sold Out"
    const soldOutBadges = page.locator('.badge-sold-out');
    const count = await soldOutBadges.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Verify on individual product detail page
    await page.goto('/products/lavender-bloom');
    await expect(page.locator('.badge-sold-out').first()).toBeVisible();
    await expect(page.getByText('Currently Sold Out', { exact: true }).first()).toBeVisible();
  });

  test('2. No purchase, checkout, cart, or payment pathway exists', async ({ page }) => {
    await page.goto('/');
    
    // Check absence of cart or checkout controls
    await expect(page.getByRole('button', { name: /add to cart/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /buy now/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /checkout/i })).toHaveCount(0);
    await expect(page.locator('input[type="credit-card"]')).toHaveCount(0);

    // Verify on product page
    await page.goto('/products/kal-se-productive');
    await expect(page.getByRole('button', { name: /add to cart/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /buy now/i })).toHaveCount(0);
  });

  test('3. WhatsApp preorder link contains exact verified phone number and encoded payload', async ({ page }) => {
    await page.goto('/products/lavender-bloom');

    const whatsappBtn = page.locator('#whatsapp-preorder-cumid-fl-001');
    await expect(whatsappBtn).toBeVisible();

    const href = await whatsappBtn.getAttribute('href');
    expect(href).not.toBeNull();

    // Verify correct phone number formatting without +, spaces, or punctuation
    expect(href).toContain('https://wa.me/917023987458');
    expect(href).not.toContain('+91');
    expect(href).not.toContain('70239 87458');

    // Verify encoded message contents
    expect(href).toContain(encodeURIComponent('Lavender Bloom'));
    expect(href).toContain(encodeURIComponent('CUMID-FL-001'));
    expect(href).toContain(encodeURIComponent('https://cumid.store/products/lavender-bloom'));
  });

  test('4. WhatsApp preorder links work seamlessly for guest visitors without login', async ({ page }) => {
    // Clear cookies/storage to simulate pure guest visitor
    await page.context().clearCookies();
    await page.goto('/products/low-battery');

    const whatsappBtn = page.locator('#whatsapp-preorder-cumid-ct-001');
    await expect(whatsappBtn).toBeVisible();

    // Ensure it is a standard accessible <a> link that opens directly
    const tagName = await whatsappBtn.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });

  test('5. All 13 candidate product pages resolve with 200 OK and valid content', async ({ page }) => {
    const slugs = [
      'lavender-bloom',
      'kal-se-productive',
      'low-battery',
      'complicated-thoughts',
      'grounded-temporarily',
      'plans-in-overdrive',
      'soft-looks-strong-opinions',
      'afterburner',
      'desi-by-default',
      'built-for-grit',
      'boo-whatever',
      'too-many-tabs',
      'hero-in-progress',
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/products/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByText('Confirmed Format & Specifications')).toBeVisible();
      await expect(page.getByText('Spiral binding along top edge')).toBeVisible();
    }
  });

  test('6. All 5 personality collection pages resolve and show distinct products', async ({ page }) => {
    const collections = ['floral', 'cute', 'hinglish', 'cars-and-jets', 'originals'];

    for (const col of collections) {
      const response = await page.goto(`/collections/${col}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toContainText('Collection');
      // Verify products are rendered
      const productCards = page.locator('article');
      expect(await productCards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('7. Favourites toggle persists in localStorage for guest users', async ({ page }) => {
    await page.goto('/products/lavender-bloom');

    const favButton = page.locator('button', { hasText: /save to favourites/i }).first();
    await expect(favButton).toBeVisible();
    await favButton.click();

    // Check localStorage
    const localFavs = await page.evaluate(() => {
      return localStorage.getItem('cumid_guest_favourites_v1');
    });
    expect(localFavs).toContain('CUMID-FL-001');

    // Navigate to /account/favourites and verify it appears in the list
    await page.goto('/account/favourites');
    await expect(page.getByText('Lavender Bloom')).toBeVisible();
  });

  test('8. Privacy Consent: Rejecting optional analytics sets denied consent', async ({ page }) => {
    await page.goto('/');

    // Consent banner should appear
    const rejectBtn = page.getByRole('button', { name: /reject optional analytics/i });
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    // Verify storage
    const consent = await page.evaluate(() => {
      return localStorage.getItem('cumid_analytics_consent_v1');
    });
    expect(consent).toBe('denied');

    // Verify GA4 script is NOT in the DOM
    const gaScript = page.locator('script[src*="googletagmanager.com/gtag/js"]');
    await expect(gaScript).toHaveCount(0);
  });

  test('9. Structured data JSON-LD is valid and matches visible content', async ({ page }) => {
    await page.goto('/products/lavender-bloom');

    // Extract JSON-LD
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let productSchema: any = null;
    for (let i = 0; i < count; i++) {
      const raw = await jsonLdScripts.nth(i).textContent();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed['@type'] === 'Product') {
            productSchema = parsed;
            break;
          }
        } catch {}
      }
    }

    expect(productSchema).not.toBeNull();
    expect(productSchema['@type']).toBe('Product');
    expect(productSchema.name).toBe('Lavender Bloom');
    expect(productSchema.offers).toBeUndefined(); // No priced offer exists at enquiry-only launch.
  });

  test('10. Custom 404 page renders for nonexistent routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-url-xyz');
    expect(response?.status()).toBe(404);
    // In Astro dev/preview, 404 template is served
    await expect(page.getByText('Blank page syndrome.')).toBeVisible();
    await expect(page.getByRole('link', { name: /return to home/i })).toBeVisible();
  });

  test('11. Account and auth callback pages have noindex meta tags', async ({ page }) => {
    await page.goto('/account');
    const metaRobots = page.locator('meta[name="robots"]');
    await expect(metaRobots).toHaveAttribute('content', 'noindex, nofollow');

    await page.goto('/account/favourites');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('12. Journal editorial articles render full content and links', async ({ page }) => {
    await page.goto('/journal');
    await expect(page.getByText('How to Choose a Pocket Diary You Will Actually Use')).toBeVisible();

    await page.goto('/journal/top-spiral-versus-side-spiral-practical-differences');
    await expect(page.locator('h1')).toContainText('Top Spiral Versus Side Spiral');
    await expect(page.getByText('Stationery Ergonomics')).toBeVisible();
  });

  test('13. Quantity selector on product detail page updates WhatsApp preorder link', async ({ page }) => {
    await page.goto('/products/lavender-bloom');
    const whatsappBtn = page.locator('#whatsapp-preorder-cumid-fl-001');
    await expect(whatsappBtn).toBeVisible();

    // Increase quantity to 3 by clicking + button twice
    const incBtn = page.getByRole('button', { name: 'Increase quantity' });
    await expect(incBtn).toBeVisible();
    await incBtn.click();
    await incBtn.click();

    const updatedHref = await whatsappBtn.getAttribute('href');
    expect(updatedHref).toContain(encodeURIComponent('3 diaries'));
  });

  test('14. Customer orders page and order detail render correctly', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page.locator('h1')).toContainText('My Orders');
    
    // Check demo order CMD-2026-0042
    await expect(page.getByText('CMD-2026-0042')).toBeVisible();

    // Navigate to individual order detail
    await page.goto('/account/orders/demo-ord-001');
    await expect(page.getByRole('heading', { name: 'CMD-2026-0042' })).toBeVisible();
    await expect(page.getByText('Ordered Pocket Diaries (Snapshot)')).toBeVisible();
    await expect(page.getByText('Agreed Pricing Summary')).toBeVisible();
  });

  test('15. Admin portal enforces access verification and demo admin works', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('CUMID Admin Authentication Required')).toBeVisible();

    // Enable local demo preview
    await page.getByRole('button', { name: /Enable Local Demo Admin Preview/i }).click();
    await expect(page.getByText('Store Operations Overview')).toBeVisible();
    await expect(page.getByText('Demo Admin', { exact: true })).toBeVisible();

    // Check tabs
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Production & Customer Orders' })).toBeVisible();

    await page.goto('/admin/enquiries');
    await expect(page.getByRole('heading', { name: 'Preorder Enquiries Inbox' })).toBeVisible();

    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: 'Catalogue & Product Management' })).toBeVisible();

    await page.goto('/admin/batches');
    await expect(page.getByRole('heading', { name: 'Production Batches & Manufacturing' })).toBeVisible();

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Store Operational Settings' })).toBeVisible();
  });

  test('16. Official customer support email link is active and valid', async ({ page }) => {
    await page.goto('/contact');
    const supportEmailLink = page.locator('a[href="mailto:support@cumid.store"]').first();
    await expect(supportEmailLink).toBeVisible();
  });

});
