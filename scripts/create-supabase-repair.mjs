import fs from "node:fs/promises";
const dir = "supabase/migrations/";
const read = async (name) =>
  (await fs.readFile(dir + name, "utf8")).replace(
    /^\s*(?:BEGIN|COMMIT);\s*$/gm,
    "",
  );
const initial = await read("20261017000000_cumid_init.sql");
const store = await read("20261017000001_store_management.sql");
const checkout = await read("20261022000000_checkout_careers.sql");
const split = checkout.indexOf("CREATE TABLE public.career_applications");
const steps = [
  ["to_regclass('public.profiles') IS NULL", initial],
  [
    "to_regclass('public.orders') IS NULL",
    store.replace(
      /CREATE POLICY\s+("[^"]+")\s+ON\s+(public\.\w+)/g,
      (_, policy, table) =>
        `DROP POLICY IF EXISTS ${policy} ON ${table};\nCREATE POLICY ${policy} ON ${table}`,
    ),
  ],
  ["to_regclass('public.commerce_settings') IS NULL", checkout.slice(0, split)],
  ["to_regclass('public.career_applications') IS NULL", checkout.slice(split)],
  [
    "NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_applications' AND column_name='task_deadline')",
    await read("20261022010000_careers_feedback_rounds.sql"),
  ],
];
const sql = `-- CUMID: complete missing Supabase setup. Run in the owner's Supabase SQL Editor.\n-- Adds missing modules, preserves existing order/payment snapshots, and sets diary price to Rs 149.\n-- Checkout stays disabled by default. No credentials are embedded. Safe to run again.\nBEGIN;\nDO $repair$ BEGIN\n${steps.map(([condition, source], i) => `IF ${condition} THEN\nEXECUTE $step${i}$\n${source}\n$step${i}$;\nEND IF;`).join("\n")}\nEND $repair$;\n${await read("20261022020000_diary_pricing.sql")}\nCOMMIT;\nNOTIFY pgrst, 'reload schema';\n`;
await fs.writeFile("supabase/REPAIR_MISSING_SETUP.sql", sql);
console.log("Created supabase/REPAIR_MISSING_SETUP.sql");
