import fs from "node:fs/promises";
import path from "node:path";
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
