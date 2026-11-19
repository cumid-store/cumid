# Careers Submission and Free-Tier Timed Task Round Setup

The task round is configured to be 100% functional and strictly free-tier compatible. Candidates submit links to their work (Google Drive, Figma, GitHub, Notion, Loom, etc.) rather than file uploads, eliminating storage bucket requirements, bandwidth caps, and service-role storage keys.

## Quick Setup

1. **Supabase SQL Editor**:
   Run `supabase/CAREERS_SETUP.sql` once. It creates/updates the `career_applications` and `career_submissions` tables with RLS and the necessary RPC functions (`apply_for_career`, `create_career_submission`, `manage_career_round`, and `is_admin()`).
   - Does NOT require Supabase Storage buckets or extra paid add-ons.
   - Strictly free tier (lightweight relational tables and JSONB links).

2. **Admin Access**:
   Admin privileges are granted to accounts with `profiles.role = 'admin'` or with emails in the authorized owner allowlist (`sumitkatiyar783@gmail.com`, `ankshitdey@gmail.com`, `sumitkatiyar3655@gmail.com`).

3. **Candidate Workflow**:
   - Apply at `/careers` with name, role, intro, and optional portfolio links.
   - Check status and task rounds at `/careers/tasks`.
   - When a task round is marked `task_sent` with valid opening and deadline timestamps, the countdown timer and instructions appear.
   - Candidates submit their work links (e.g., Google Drive folder, Figma design, GitHub repo) with optional notes.
   - Submissions appear immediately under past work with clickable links.

4. **Admin Management (`/admin/careers`)**:
   - Review incoming applications.
   - Open / schedule task rounds: enter task instructions, opening time (IST), and deadline (IST).
   - Review candidate submissions and click candidate work links directly.
