import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function securityHeaders() {
  return { name: 'cumid-security-headers', hooks: { 'astro:build:done': async ({ dir }) => {
    const root = fileURLToPath(dir);
    const hashes = new Set();
    async function scan(path) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) await scan(file);
        else if (file.endsWith('.html')) {
          const html = await readFile(file, 'utf8');
          for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (!/\bsrc\s*=/.test(match[1]) && !/application\/ld\+json/i.test(match[1]) && match[2].trim()) {
              hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
            }
          }
        }
      }
    }
    await scan(root);
    const file = join(root, '_headers');
    const template = await readFile(file, 'utf8');
    await writeFile(file, template.replace('__SCRIPT_HASHES__', [...hashes].join(' ')));
  } } };
}
