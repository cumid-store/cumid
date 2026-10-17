import { spawn } from 'node:child_process';
import { serve } from './static-preview.mjs';
const env = { ...process.env, CUMID_E2E: '1', PUBLIC_GA4_MEASUREMENT_ID: 'G-CUMIDTEST',
  PUBLIC_SUPABASE_URL: 'https://cumid-test.supabase.co', PUBLIC_SUPABASE_ANON_KEY: 'test-public-key-not-a-secret',
  PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: '' };
const bin = 'node_modules/astro/bin/astro.mjs';
const build = spawn(process.execPath, [bin, 'build'], { stdio: 'inherit', env });
build.on('exit', code => {
  if (code !== 0) process.exit(code || 1);
  const server = serve('dist-e2e',4322);
  process.on('SIGTERM', () => server.close(()=>process.exit(0)));
  process.on('SIGINT', () => server.close(()=>process.exit(0)));
});
