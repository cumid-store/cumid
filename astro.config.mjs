import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import securityHeaders from './scripts/security-headers.mjs';


// https://astro.build/config
export default defineConfig({
  site: 'https://cumid.store',
  output: 'static',
  outDir: process.env.CUMID_E2E === '1' ? './dist-e2e' : './dist',
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
  integrations: [
    react(),
    securityHeaders(),

  ],
});
