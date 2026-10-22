import { build } from 'esbuild';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await build({entryPoints:['src/config/preorder.ts'],outfile:'artifacts/tests/preorder.mjs',bundle:true,format:'esm',platform:'node'});
const {preorderTotal,preorderMessage}=await import('../artifacts/tests/preorder.mjs');
assert.equal(preorderTotal(1),199);
assert.equal(preorderTotal(2),348);
assert.equal(preorderTotal(10),1540);
for(const value of [0,-1,1.5,11,NaN])assert.throws(()=>preorderTotal(value));
const message=preorderMessage({id:'test',name:'Test & diary',slug:'test'},2);
assert.ok(message.includes('Total: ₹348'));
assert.ok(message.includes('14 days of payment confirmation'));
let count=0;
for(const slug of await fs.readdir('dist/client/products')) {
 const html=await fs.readFile('dist/client/products/'+slug+'/index.html','utf8');
 const product=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1])).find(s=>s['@type']==='Product');
 assert.ok(product,slug);
 assert.equal(product.offers.availability,'https://schema.org/PreOrder');
 assert.equal(product.offers.price,149);
 assert.equal(product.offers.shippingDetails.shippingRate.value,50);
 count++;
}
assert.equal(count,13);
console.log('PASS: quantity validation, per-order shipping totals, message delivery terms and all 13 product offer schemas.');
