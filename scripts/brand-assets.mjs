import fs from 'node:fs';
import sharp from 'sharp';
const symbol = fs.readFileSync('public/brand/logo-mark.svg', 'utf8').replace(/<svg[^>]*>/, '').replace('</svg>', '');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#F7F4EF"/><g transform="translate(-60,-110) scale(.7)">${symbol}</g><text x="660" y="260" font-family="sans-serif" font-size="65" fill="#252321">CUMID</text><text x="660" y="330" font-family="sans-serif" font-size="28" fill="#756284">Small diaries.</text><text x="660" y="370" font-family="sans-serif" font-size="28" fill="#756284">A little more you.</text><text x="660" y="480" font-family="sans-serif" font-size="22" fill="#596B58">cumid.store</text></svg>`;
fs.writeFileSync('public/brand/og-image.svg', og);
await sharp(Buffer.from(og)).png().toFile('public/brand/og-image.png');
await sharp('public/brand/logo-mark.svg').resize(192,192,{fit:'contain',background:'#F7F4EF'}).png().toFile('public/brand/icon-192.png');
await sharp('public/brand/logo-mark.svg').resize(512,512,{fit:'contain',background:'#F7F4EF'}).png().toFile('public/brand/icon-512.png');
