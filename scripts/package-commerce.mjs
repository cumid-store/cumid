import fs from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve('artifacts/releases/CUMID-Payments-Careers-2026-10-22');
await fs.mkdir(target,{recursive:true});
await fs.cp('dist',path.join(target,'dist'),{recursive:true,filter:(source)=>!source.split(path.sep).some(part=>part.startsWith('.'))&&!source.endsWith('.map')});
await fs.copyFile('docs/PAYMENTS_AND_CAREERS_LAUNCH.md',path.join(target,'SETUP.md'));
await fs.copyFile('supabase/migrations/20261022000000_checkout_careers.sql',path.join(target,'SUPABASE-MIGRATION.sql'));
await fs.writeFile(path.join(target,'README.txt'),'CUMID payment and careers build\n\nThis requires a Cloudflare Worker deployment, not static folder upload.\nRead SETUP.md. Keep the dist/client and dist/server folders together.\nFrom this folder: npx wrangler deploy --config dist/server/wrangler.json\nApply the migration and configure server secrets before enabling the services.\nReal-money payments remain disabled until all documented setup steps are complete.\nNo gateway secrets are included.\n');
console.log(target);
