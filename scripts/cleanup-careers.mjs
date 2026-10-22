// Dry run by default. Run manually with --apply after reviewing counts.
// Supply SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY via the environment, never arguments.
import { createClient } from "@supabase/supabase-js";
const db = createClient(
  process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const apply = process.argv.includes("--apply");
const cutoff = new Date(Date.now() - 180 * 86400000).toISOString();
const { data: candidates, error } = await db
  .from("career_applications")
  .select("id,career_submissions(created_at)")
  .lt("created_at", cutoff)
  .in("status", ["received", "closed"])
  .limit(100);
if (error) throw error;
const apps = candidates.filter(app => app.career_submissions.every(sub => sub.created_at < cutoff));
console.log(
  `${apps.length} inactive applications older than 180 days; mode: ${apply ? "apply" : "dry run"}`,
);
for (const app of apps) {
  const { data: files, error } = await db
    .from("career_files")
    .select("path")
    .eq("application_id", app.id);
  if (error) throw error;
  if (apply) {
    if (files.length) {
      const r = await db.storage
        .from("career-files")
        .remove(files.map((f) => f.path));
      if (r.error) throw r.error;
    }
    const r = await db.from("career_applications").delete().eq("id", app.id);
    if (r.error) throw r.error;
  }
}
// Find orphaned files left by account deletion. Bucket paths are user-id/random-id.
let orphaned = 0;
for (let offset = 0; ; offset += 100) {
  const { data: dirs, error } = await db.storage
    .from("career-files")
    .list("", { limit: 100, offset });
  if (error) throw error;
  if (!dirs.length) break;
  for (const dir of dirs) {
    if (dir.id) continue;
    for (let inner = 0; ; inner += 100) {
      const { data: files, error } = await db.storage
        .from("career-files")
        .list(dir.name, { limit: 100, offset: inner });
      if (error) throw error;
      if (!files.length) break;
      const paths = files
        .filter((f) => f.id && Date.now() - Date.parse(f.created_at) > 86400000)
        .map((f) => dir.name + "/" + f.name);
      if (!paths.length) continue;
      const { data: records, error: recordError } = await db
        .from("career_files")
        .select("path")
        .in("path", paths);
      if (recordError) throw recordError;
      const known = new Set(records.map((r) => r.path));
      const stale = paths.filter((p) => !known.has(p));
      orphaned += stale.length;
      if (apply && stale.length) {
        const r = await db.storage.from("career-files").remove(stale);
        if (r.error) throw r.error;
      }
    }
  }
}
console.log(
  `${orphaned} orphaned files ${apply ? "removed" : "eligible for removal"}. Re-run until no eligible records remain; active applications require owner review.`,
);
