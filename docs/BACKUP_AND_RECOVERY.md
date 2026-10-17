# CUMID (cumid.store) — Manual Backup & Recovery Guide

On the Supabase Free Tier, automated point-in-time recovery (PITR) and daily snapshot restore are not included. This manual explains how the store owner can perform periodic backups, handle dormant project reactivation, and restore customer favourites.

---

## 1. Supabase Database Backups

Because the storefront's database stores `profiles` and `favourites`, backups are lightweight (< 5MB) and straightforward to execute.

### Method A: Manual CSV / Table Export (Dashboard UI)
1. Log in to [Supabase Dashboard](https://app.supabase.com).
2. Select your `cumid-store` project.
3. In the sidebar, click **Table Editor**.
4. Select `profiles`:
   - Click **Export > Export to CSV**.
   - Save file as `profiles_backup_YYYY-MM-DD.csv`.
5. Select `favourites`:
   - Click **Export > Export to CSV**.
   - Save file as `favourites_backup_YYYY-MM-DD.csv`.
6. Store backups securely in an encrypted local folder or Google Drive.

### Method B: PostgreSQL `pg_dump` (Full SQL Dump)
If the owner has PostgreSQL CLI client installed locally:
```bash
pg_dump "postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  -f cumid_backup_$(date +%Y%m%d).sql
```

---

## 2. Dormant Project Reactivation (7-Day Inactivity Rule)

### The Inactivity Rule
Supabase Free Tier projects that receive zero API requests for 7 consecutive days are automatically paused to conserve resources.
> Note: Artificial keep-alive pingers or automated bot scripts are strictly prohibited under Supabase Free terms.

### Reactivation Procedure
1. If the project enters paused status:
   - The public website continues operating without interruption (guest browsing, catalog, journal, and WhatsApp preorder links all remain functional).
2. To wake the database:
   - Log into `https://app.supabase.com`.
   - On the project card, click **Restore Project**.
   - Restoration takes approximately 60–90 seconds.

---

## 3. Disaster Recovery & Migration to a Fresh Project

If a Supabase project is accidentally deleted or corrupted:
1. Create a fresh project in Supabase (Select region: `ap-south-1` Mumbai for Indian lowest latency).
2. Open the **SQL Editor** in the new project.
3. Run `supabase/migrations/20261017000000_cumid_init.sql`.
4. Import your latest exported CSV files via Table Editor > Insert > Import data from CSV.
5. In Cloudflare Pages, update `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to point to the new project.
6. Trigger a deployment. The storefront is fully restored.
