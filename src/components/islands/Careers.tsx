import React, { useEffect, useState } from "react";
import { api, uploadCareerFile } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { CAREER_ROLES, MAX_FILES, MAX_FILE_BYTES } from "../../config/commerce";
const parseLinks = (s: FormDataEntryValue | null) =>
  String(s || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
export default function Careers({ portal = false }: { portal?: boolean }) {
  const [signedIn, setSignedIn] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [applications, setApplications] = useState<any[]>([]);
  async function refresh() {
    setApplications(await api("careers/applications"));
  }
  useEffect(() => {
    async function load() {
      try {
        const session = await supabase?.auth.getSession();
        setSignedIn(!!session?.data.session);
        if (session?.data.session && portal) await refresh();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);
  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const app = await api("careers/applications", {
        name: data.get("name"),
        role: data.get("role"),
        introduction: data.get("introduction"),
        links: parseLinks(data.get("links")),
        consent: data.get("consent") === "on",
      });
      setMessage(
        "Application received. Your reference is " +
          app.id +
          ". You can return to the task portal with this Google account.",
      );
      form.reset();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);
    try {
      if (
        files.length > MAX_FILES ||
        files.some((f) => f.size > MAX_FILE_BYTES)
      )
        throw new Error(
          "Use up to 3 files, at most 2 MB each. For larger files or any other format, paste a Drive folder/file link.",
        );
      const externalLinks = parseLinks(data.get("links"));
      if (!externalLinks.length && !files.length)
        throw new Error("Add a file or at least one Drive / work link.");
      const submission = await api("careers/submissions", {
        applicationId: data.get("applicationId"),
        title: data.get("title"),
        notes: data.get("notes"),
        links: externalLinks,
      });
      const failed: string[] = [];
      for (const file of files) {
        try {
          await uploadCareerFile(submission.id, file);
        } catch {
          failed.push(file.name);
        }
      }
      setMessage(
        failed.length
          ? `Task saved. These files did not upload: ${failed.join(", ")}. Submit their Drive links as a follow-up below.`
          : "Your task has been submitted. Thank you!",
      );
      form.reset();
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Loading…</p>;
  return (
    <div className="commerce-form">
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {!signedIn ? (
        <div className="notice">
          <h2>One sign-in. Everything in one place.</h2>
          <p>Use Google to apply and return to your submissions.</p>
          <a
            className="btn-primary"
            href={
              "/account?redirect=" +
              encodeURIComponent(portal ? "/careers/tasks" : "/careers")
            }
          >
            Sign in to {portal ? "submit work" : "apply"}
          </a>
        </div>
      ) : portal ? (
        <>
          {!applications.length ? (
            <p className="notice">
              No application is linked to this account yet.{" "}
              <a href="/careers">Apply here first</a>. If you applied by email
              or WhatsApp, use this short form once to connect your application.
            </p>
          ) : (
            <>
              <form onSubmit={submit}>
                <label>
                  Your application
                  <select name="applicationId" required>
                    {applications.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.role} — {a.status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Task name
                  <input
                    name="title"
                    required
                    maxLength={160}
                    placeholder="e.g. Instagram launch concepts"
                  />
                </label>
                <label>
                  Drive folder / file links
                  <textarea
                    name="links"
                    placeholder="One HTTPS link per line"
                    maxLength={12000}
                  />
                </label>
                <p className="small">
                  Drive links are preferred. Share view access with
                  support@cumid.store, or use “Anyone with the link” only if you
                  are comfortable doing so. We do not need edit access. Any file
                  format can be shared this way.
                </p>
                <label>
                  Or attach small files
                  <input type="file" name="files" multiple />
                </label>
                <p className="small">
                  Up to 3 files per submission, 2 MB each. Total upload
                  allowance: 6 MB per application. All formats are accepted as
                  downloads. For larger work, use Drive links. Keep your own
                  copy.
                </p>
                <label>
                  A short note (optional)
                  <textarea name="notes" maxLength={2000} />
                </label>
                <button className="btn-primary" disabled={busy}>
                  {busy ? "Saving your work…" : "Submit task"}
                </button>
              </form>
              <h2 className="mt-10">Your applications & work</h2>
              {applications.map((a) => (
                <article key={a.id}>
                  <strong>{a.role}</strong>
                  <p>Status: {a.status.replaceAll("_", " ")}</p>
                  <small>Application: {a.id}</small>
                  {a.career_submissions?.map((s: any) => (
                    <div className="task" key={s.id}>
                      <strong>{s.title}</strong>
                      <p>{s.notes}</p>
                      <small>
                        {new Date(s.created_at).toLocaleDateString("en-IN")}
                      </small>
                      <ul>
                        {s.links.map((link: string) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                      {s.career_files?.map((f: any) => (
                        <p key={f.id}>
                          {f.name} —{" "}
                          {f.state === "uploaded"
                            ? "uploaded"
                            : "upload incomplete; use a Drive link"}
                        </p>
                      ))}
                    </div>
                  ))}
                </article>
              ))}
            </>
          )}
        </>
      ) : (
        <form onSubmit={apply}>
          <label>
            Your name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>
            Where would you like to help?
            <select name="role" required>
              <option value="">Choose an area</option>
              {CAREER_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Tell us a little about you
            <textarea
              name="introduction"
              required
              maxLength={2000}
              placeholder="What do you enjoy making or doing? What would you like to work on at CUMID?"
            />
          </label>
          <label>
            Portfolio / CV / Drive links (optional)
            <textarea
              name="links"
              maxLength={12000}
              placeholder="One HTTPS link per line"
            />
          </label>
          <p className="small">
            No long cover letter needed. We use the email from your Google
            account. Share view access with support@cumid.store for private
            Drive links.
          </p>
          <label className="check">
            <input name="consent" type="checkbox" required />
            <span>
              I am 18 or older. I agree that CUMID may use my application and
              submitted work to assess my application and contact me about it. I
              have read the{" "}
              <a href="/privacy#recruitment" target="_blank">
                recruitment privacy notice
              </a>
              .
            </span>
          </label>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send application"}
          </button>
          <a href="/careers/tasks">Already applied? Submit your task</a>
        </form>
      )}
    </div>
  );
}
