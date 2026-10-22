import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.CUMID_E2E === '1' ? 'dist-e2e' : 'dist');
const config = path.join(root, 'server/wrangler.json');
if (!fs.existsSync(config) || !fs.existsSync(path.join(root, 'client/checkout/index.html'))) {
  throw new Error('Incomplete Worker build. Payments require both dist/client and dist/server.');
}
const worker = JSON.parse(fs.readFileSync(config, 'utf8'));
if (!worker.main || !worker.assets?.run_worker_first?.includes('/api/*')) throw new Error('Worker API routing missing.');
console.log('[postbuild] Worker and static assets verified. Deploy with wrangler deploy --config dist/server/wrangler.json.');
