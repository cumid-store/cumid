import { test, expect } from '@playwright/test';
import { PRODUCTS } from '../src/data/products';
import { readFile } from 'node:fs/promises';

test('Every catalogue design, image and enquiry resolves', async ({page, request}) => {
 await page.goto('/shop');
 await expect(page.locator('article.product-card')).toHaveCount(PRODUCTS.length);
 await expect(page.locator('article.product-card .diary-binding')).toHaveCount(PRODUCTS.length);
 expect(PRODUCTS.length).toBe(13);
 for(const product of PRODUCTS) {
  await page.goto(`/products/${product.slug}`);
  await expect(page.locator('h1')).toHaveText(product.name);
  await expect(page.locator(`#whatsapp-preorder-${product.id.toLowerCase()}`)).toHaveAttribute('href',new RegExp(encodeURIComponent(product.id)));
  for(const image of product.images) {
   const response=await request.get(image.src);
   expect(response.ok(),image.src).toBeTruthy();
   expect(response.headers()['content-type']).toContain('image/webp');
  }
 }
});

test('Originals favourites survive reload and FAQ has a main heading',async({page})=>{
 await page.goto('/products/desi-by-default');
 await page.getByRole('button',{name:'Save Desi by Default to favourites',exact:true}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:'Remove Desi by Default from favourites',exact:true})).toBeVisible();
 await page.goto('/account/favourites');
 await expect(page.getByText('Desi by Default',{exact:true})).toBeVisible();
 await page.goto('/faq');
 await expect(page.locator('h1')).toHaveText('Frequently asked questions');
 await expect(page.locator('a[href="mailto:support@cumid.store"]').first()).toBeVisible();
});

test('Mobile catalogue and product have no horizontal overflow', async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('cumid_analytics_consent_v1','denied'));
 for(const path of ['/','/shop','/collections/originals','/products/soft-looks-strong-opinions']) {
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBeTruthy();
  await expect(page.locator('h1')).toBeVisible();
 }
});

test('Built CSP permits hydration and gallery without inline-script violations',async({page})=>{
 const headers=await readFile('dist-e2e/_headers','utf8');
 const csp=headers.match(/Content-Security-Policy: (.+)/)![1];
 expect(csp).not.toContain('__SCRIPT_HASHES__');
 expect(csp.split(';')[1]).not.toContain('unsafe-inline');
 expect(csp.length).toBeLessThan(1900);
 const violations:string[]=[];
 await page.exposeFunction('reportCsp',(directive:string)=>violations.push(directive));
 await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window as any).reportCsp(e.violatedDirective)));
 await page.route('http://127.0.0.1:4322/**',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});
 });
 await page.goto('/products/soft-looks-strong-opinions');
 await page.getByRole('button',{name:'Reject optional analytics',exact:true}).click();
 await page.getByRole('button',{name:'View image 2',exact:true}).click();
 await expect(page.locator('#main-product-image')).toHaveAttribute('src',/mockup.webp/);
 await page.getByRole('button',{name:'Save Soft Looks, Strong Opinions to favourites',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('cumid_guest_favourites_v1'))).toContain('CUMID-CT-003');
 expect(violations).toEqual([]);
});
