import {readFile,mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out='outputs/logo-variations';
await mkdir(out,{recursive:true});
const original=await readFile('public/brand/logo-mark.svg','utf8');
const paths=original.match(/<path[^>]+\/>/g).join('');
const variants=[
 ['01-signature','Signature','#756284','#596B58','#F7F4EF'],
 ['02-black','Pure black','#000000','#000000','#FFFFFF'],
 ['03-white','Pure white','#FFFFFF','#FFFFFF','#252321'],
 ['04-lavender','Deep lavender','#62537D','#62537D','#F7F4EF'],
 ['05-forest','Forest green','#364F40','#364F40','#F7F4EF'],
 ['06-sage-cream','Cream on sage','#F7F4EF','#DFC3B2','#596B58'],
 ['07-midnight-lilac','Midnight & lilac','#BAACD1','#E5EAE3','#292637'],
 ['08-clay-charcoal','Clay & charcoal','#AD715C','#37352F','#F3EDE5'],
];
function mark(a,b){return paths.replaceAll('#756284',a).replaceAll('#596B58',b)}
function svg(a,b,bg){return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><title>CUMID Notebook Bird</title>${bg?`<rect width="1200" height="1200" fill="${bg}"/>`:''}<g transform="translate(120 178) scale(1.297297) translate(-280 -300)">${mark(a,b)}</g></svg>`}
let tiles='';
for(const [i,[slug,name,a,b,bg]] of variants.entries()){
 const transparent=svg(a,b);
 await writeFile(`${out}/${slug}.svg`,transparent);
 await sharp(Buffer.from(transparent)).resize(2400,2400).png().toFile(`${out}/${slug}-transparent.png`);
 const social=svg(a,b,bg);
 await writeFile(`${out}/${slug}-square.svg`,social);
 await sharp(Buffer.from(social)).png().toFile(`${out}/${slug}-square.png`);
 const x=(i%4)*400,y=Math.floor(i/4)*450;
 const label=bg==='#252321'||bg==='#596B58'||bg==='#292637'?'#F7F4EF':'#252321';
 tiles+=`<g transform="translate(${x} ${y})"><rect width="400" height="450" fill="${bg}"/><g transform="translate(65 46) scale(.365) translate(-280 -300)">${mark(a,b)}</g><text x="28" y="365" font-family="Arial,sans-serif" font-size="22" fill="${label}">${name.replaceAll('&','&amp;')}</text><text x="28" y="399" font-family="Arial,sans-serif" font-size="13" fill="${label}">${a===b?a:a+' / '+b}</text></g>`;
}
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">${tiles}</svg>`;
await writeFile(`${out}/logo-colour-board.svg`,sheet);
await sharp(Buffer.from(sheet)).png().toFile(`${out}/logo-colour-board.png`);
await writeFile(`${out}/README.txt`,`CUMID Notebook Bird colour variations\n\nRecommended LinkedIn tagline: Pocket diaries with personality. A little space for your everyday.\n\nAll variants preserve the existing non-text symbol.\nSVG: transparent, scalable artwork, preferred for printing and design work.\nTransparent PNG: 2400 x 2400 pixels. White-on-transparent will look blank in a white viewer.\nSquare PNG/SVG: background included, suitable for social profile images.\nSignature is recommended as the primary brand identity; monochrome versions suit one-colour printing.\nThese exports do not change the website or the Cloudflare upload.\n`);
console.log(out);
