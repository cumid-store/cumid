import fs from 'node:fs';
import path from 'node:path';

const distClient = path.resolve('dist/client');
const distRoot = path.resolve('dist');

if (fs.existsSync(distClient)) {
  console.log('[postbuild] Ensuring static files exist at both dist/ and dist/client/ for Cloudflare Pages compatibility...');
  try {
    const entries = fs.readdirSync(distClient);
    for (const entry of entries) {
      if (entry === 'client' || entry === 'server') continue;
      const src = path.join(distClient, entry);
      const dest = path.join(distRoot, entry);
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
    console.log('[postbuild] ✓ Successfully mirrored dist/client/ entries to dist/');
  } catch (err) {
    console.warn('[postbuild] Notice during copy (safe to continue):', err);
  }
}
