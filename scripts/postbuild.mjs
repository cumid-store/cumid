import fs from 'node:fs';
import path from 'node:path';

const distClient = path.resolve('dist/client');
const distRoot = path.resolve('dist');

if (fs.existsSync(distClient)) {
  console.log('[postbuild] Ensuring static files exist at both dist/ and dist/client/ for Cloudflare Pages compatibility...');
  try {
    fs.cpSync(distClient, distRoot, {
      recursive: true,
      force: true,
      filter: (src) => !src.includes('node_modules'),
    });
    console.log('[postbuild] ✓ Successfully mirrored dist/client/ to dist/ for zero-config Cloudflare Pages deployments.');
  } catch (err) {
    console.warn('[postbuild] Warning copying files:', err);
  }
}
