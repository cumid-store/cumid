import fs from "node:fs/promises";
import path from "node:path";
const base = await fs.readFile(
  "supabase/migrations/20261022000000_checkout_careers.sql",
  "utf8",
);
const start = base.indexOf("CREATE TABLE public.career_applications");
const sql = base.slice(start, base.lastIndexOf("COMMIT;"));
const patch = await fs.readFile(
  "supabase/migrations/20261022010000_careers_feedback_rounds.sql",
  "utf8",
);
const bootstrap = `-- CUMID careers-only initial setup. Run once in Supabase SQL Editor.\n-- Does not alter payment, order or catalogue data.\n-- Requires the existing CUMID profiles table from account setup.\nBEGIN;\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer', ADD COLUMN IF NOT EXISTS phone text;\nREVOKE INSERT,UPDATE ON public.profiles FROM authenticated;\nGRANT UPDATE(display_name,avatar_url,phone,updated_at) ON public.profiles TO authenticated;\nCREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') $$;\nDO $bootstrap$ BEGIN\nIF to_regclass('public.career_applications') IS NULL THEN\nEXECUTE $install$${sql}$install$;\nEND IF;\nEND $bootstrap$;\nCOMMIT;\n\n`;
await fs.writeFile("supabase/CAREERS_SETUP.sql", bootstrap + patch);
const target = path.resolve("artifacts/releases/CUMID-Careers-Fix");
await fs.mkdir(target, { recursive: true });
await fs.cp("dist", path.join(target, "dist"), {
  recursive: true,
  filter: (s) =>
    !s.split(path.sep).some((p) => p.startsWith(".")) && !s.endsWith(".map"),
});
await fs.copyFile(
  "supabase/CAREERS_SETUP.sql",
  path.join(target, "CAREERS_SETUP.sql"),
);
await fs.copyFile("docs/CAREERS_FIX_SETUP.md", path.join(target, "SETUP.md"));
console.log(target);
