import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser = await chromium.launch();
for (const [name,width,height,path] of [['home-desktop',1440,1000,'/'],['home-mobile',390,844,'/'],['shop-desktop',1440,1000,'/shop'],['product-mobile',390,844,'/products/soft-looks-strong-opinions']]) {
 const page = await browser.newPage({viewport:{width,height}});
 await page.addInitScript(()=>localStorage.setItem('cumid_analytics_consent_v1','denied'));
 await page.goto('http://127.0.0.1:4330'+path);
 await page.locator('img').evaluateAll(async images=>{ for(const i of images) i.loading='eager'; await Promise.all(images.map(i=>i.decode().catch(()=>{}))); });
 // Visit each product image so Chromium paints off-screen lazy media before a full-page capture.
 for (const img of await page.locator('.product-art img').all()) await img.scrollIntoViewIfNeeded();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});
 console.log(name,await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)})));
 await page.close();
}
await browser.close();
