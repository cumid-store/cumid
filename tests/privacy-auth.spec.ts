import { test, expect, type Page } from '@playwright/test';

test('Cloudflare trailing-slash routes retain Original product analytics',async({page})=>{
 await mockAnalytics(page);
 await page.goto('/products/desi-by-default/');
 await page.getByRole('button',{name:'Accept analytics',exact:true}).click();
 const commands=await page.evaluate(()=>JSON.stringify((window as any).dataLayer.map((args:any)=>Array.from(args))));
 expect(commands).toContain('https://cumid.store/products/desi-by-default');
 expect(commands).toContain('CUMID-OR-001');
 expect(commands).toContain('originals');
 expect(commands).not.toContain('https://cumid.store/404');
});

async function mockAnalytics(page: Page) {
  const requests: string[] = [];
  page.on('request', req => {
    if (/googletagmanager|google-analytics/.test(req.url())) requests.push(req.url());
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.__testGtagLoaded = true;',
  }));
  await page.route('https://**.google-analytics.com/**', route => route.fulfill({ status: 204 }));
  return requests;
}

test('No Google requests before consent or after rejection', async ({ page }) => {
  const requests = await mockAnalytics(page);
  await page.goto('/products/lavender-bloom');
  await page.getByRole('button', { name: 'Reject optional analytics', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(requests).toEqual([]);
});

test('Opt-in loads GA; payloads strip personal query values; revocation unloads it', async ({ page }) => {
  const requests = await mockAnalytics(page);
  await page.goto('/products/lavender-bloom?email=private@example.com&utm_campaign=9201871597&utm_source=instagram#secret');
  await page.getByRole('button', { name: 'Accept analytics', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  const commands = await page.evaluate(() => JSON.stringify((window as any).dataLayer.map((args: any) => Array.from(args))));
  expect(commands).toContain('https://cumid.store/products/lavender-bloom');
  expect(commands).toContain('instagram');
  expect(commands).not.toMatch(/private@example|9201871597|#secret/);
  await page.getByRole('button', { name: 'Cookie & Privacy Preferences' }).click();
  await page.getByRole('button', { name: 'Reject optional analytics', exact: true }).click();
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  await page.reload();
  expect(requests).toHaveLength(1);
});

test('Private account and callback pages do not load analytics even after opt-in', async ({ page }) => {
  const requests = await mockAnalytics(page);
  await page.addInitScript(() => localStorage.setItem('cumid_analytics_consent_v1', 'granted'));
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await page.goto('/auth/callback?error=access_denied');
  await expect(page).toHaveURL(/account\?signin_error=1/);
  await expect(page.getByText('Sign-in could not be completed. Please try again.')).toBeVisible();
  expect(requests).toEqual([]);
});

test('WhatsApp link works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/products/low-battery');
  await expect(page.locator('#whatsapp-preorder-cumid-ct-001')).toHaveAttribute('href', /^https:\/\/wa.me\/(917023987458|919201871597)\?text=/);
  await context.close();
});

test('Privacy dialog traps keyboard focus and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  const close = page.getByRole('button', { name: 'Close preferences' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Accept analytics', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

const idA = '11111111-1111-4111-8111-111111111111';
function session(id: string) {
  const exp = Math.floor(Date.now()/1000) + 3600;
  const token = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'), Buffer.from(JSON.stringify({sub:id,exp,role:'authenticated',aud:'authenticated'})).toString('base64url'), 'test-signature'].join('.');
  return { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: exp, expires_in: 3600,
    user: { id, email: 'test@example.invalid', aud:'authenticated', role:'authenticated', user_metadata:{full_name:'Test Reader'}, app_metadata:{provider:'google'}, created_at: new Date().toISOString() } };
}

test('Cloud favourites stay out of guest storage and disappear after sign-out', async ({ page }) => {
  await page.route('https://cumid-test.supabase.co/**', route => {
    const url = route.request().url();
    return route.fulfill({ status: url.includes('/logout') ? 204 : 200, contentType: 'application/json', body: url.includes('/logout') ? '' : JSON.stringify([{product_id:'CUMID-FL-001'}]) });
  });
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('sb-cumid-test-auth-token', JSON.stringify(value)), session(idA));
  await page.goto('/account/favourites');
  await expect(page.getByText('Lavender Bloom')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cumid_guest_favourites_v1'))).toBeNull();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/account/favourites');
  await expect(page.getByText('No favourites saved yet')).toBeVisible();
});

test('Cloud write failure does not claim a favourite was saved', async ({ page }) => {
  await page.route('https://cumid-test.supabase.co/**', route => route.fulfill({
    status: route.request().method() === 'GET' ? 200 : 403,
    contentType:'application/json', body: route.request().method() === 'GET' ? '[]' : '{"message":"denied"}',
  }));
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('sb-cumid-test-auth-token', JSON.stringify(value)), session(idA));
  await page.goto('/products/lavender-bloom');
  page.on('dialog', dialog => dialog.accept());
  const button = page.getByRole('button', { name: 'Save Lavender Bloom to favourites', exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('cumid_guest_favourites_v1'))).toBeNull();
});
