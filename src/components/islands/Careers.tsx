import React, { useEffect, useState, useRef } from "react";
import { uploadCareerFile } from "../../lib/api";
import { careerRequest as api, roundState, roundDate } from "../../lib/careers";
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
    [applications, setApplications] = useState<any[]>([]),
    [now, setNow] = useState(Date.now()),
    [clockOffset, setClockOffset] = useState(0),
    [selectedId, setSelectedId] = useState(""),
    [uploadsEnabled, setUploadsEnabled] = useState(false),
    [syncError, setSyncError] = useState("");
  const feedback = useRef<HTMLDivElement>(null),
    refreshVersion = useRef(0);
  async function refresh() {
    const version = ++refreshVersion.current;
    const result = await api("careers/applications");
    if (version !== refreshVersion.current) return;
    setApplications(Array.isArray(result) ? result : result.applications);
    setUploadsEnabled(result.uploadsEnabled === true);
    if (result.serverNow) {
      const offset = Date.parse(result.serverNow) - Date.now();
      setClockOffset(offset);
      setNow(Date.now() + offset);
    }
    setSyncError("");
  }
  useEffect(() => {
    if (error || message)
      feedback.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error, message]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + clockOffset), 1000);
    return () => clearInterval(timer);
  }, [clockOffset]);
  useEffect(() => {
    async function load() {
      try {
        const session = await supabase?.auth.getSession();
        setSignedIn(!!session?.data.session);
        if (session?.data.session) await refresh();
      } catch (e: any) {
        setSyncError(e.message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    const sync = () => {
      if (document.visibilityState === "visible")
        void refresh().catch((e) => setSyncError(e.message));
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [signedIn]);
  const openApps = applications.filter((a) => roundState(a, now) === "open");
  const selected = openApps.find((a) => a.id === selectedId) || openApps[0];
  const invalid = () => {
    setMessage("");
    setError(
      "Please complete the required fields and tick the consent checkbox before sending.",
    );
  };
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
      if (!app?.id)
        throw new Error(
          "We could not confirm that your application was saved. Check My applications before retrying.",
        );
      refreshVersion.current++;
      setApplications((old) => [
        {
          ...app,
          career_submissions:
            old.find((a) => a.id === app.id)?.career_submissions || [],
        },
        ...old.filter((a) => a.id !== app.id),
      ]);
      setMessage(
        (app.created === false
          ? "Your application was already received. Reference: "
          : "Application received successfully. Your reference is ") +
          app.id +
          ". It is linked to this account. Your task round will appear here when assigned.",
      );
      form.reset();
      void refresh().catch(() =>
        setSyncError(
          "Application saved. The latest list could not be refreshed; use Refresh applications to try again.",
        ),
      );
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
      await refresh().catch(() =>
        setSyncError(
          "Task saved. Refresh applications to reload the latest list.",
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Loading…</p>;
  return (
    <div className="commerce-form">
      <div ref={feedback} tabIndex={-1}>
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
        {syncError && (
          <p className="notice" role="alert">
            {syncError}
          </p>
        )}
        {signedIn && (
          <div className="actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void refresh().catch((e) => setSyncError(e.message));
              }}
            >
              Refresh applications
            </button>
            {!portal && (
              <a href="/careers/tasks">View application & task round →</a>
            )}
          </div>
        )}
      </div>
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
          {!applications.length && !syncError ? (
            <p className="notice">
              No application is linked to this account yet.{" "}
              <a href="/careers">Apply here first</a>. If you applied by email
              or WhatsApp, use this short form once to connect your application.
            </p>
          ) : applications.length ? (
            <>
              {openApps.length > 0 ? (
                <>
                  <div className="notice">
                    <strong>Task round open</strong>
                    <p>Deadline: {roundDate(selected.task_deadline)}</p>
                    <p role="timer" aria-live="off">
                      Time remaining:{" "}
                      {new Date(
                        Math.max(0, Date.parse(selected.task_deadline) - now),
                      )
                        .toISOString()
                        .slice(11, 19)}
                      {Date.parse(selected.task_deadline) - now >= 86400000
                        ? " (+ " +
                          Math.floor(
                            (Date.parse(selected.task_deadline) - now) /
                              86400000,
                          ) +
                          " days)"
                        : ""}
                    </p>
                    <p className="whitespace-pre-wrap">{selected.task_brief}</p>
                  </div>
                  <form onSubmit={submit}>
                    <label>
                      Your application
                      <select
                        name="applicationId"
                        required
                        value={selected.id}
                        onChange={(e) => setSelectedId(e.target.value)}
                      >
                        {openApps.map((a) => (
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
                      support@cumid.store, or use “Anyone with the link” only if
                      you are comfortable doing so. We do not need edit access.
                      Any file format can be shared this way.
                    </p>
                    <label>
                      Or attach small files
                      <input
                        type="file"
                        name="files"
                        multiple
                        disabled={!uploadsEnabled}
                      />
                    </label>
                    <p className="small">
                      Up to 3 files per submission, 2 MB each. Total upload
                      allowance: 6 MB per application. All formats are accepted
                      as downloads. For larger work, use Drive links. Keep your
                      own copy.
                    </p>
                    {!uploadsEnabled && (
                      <p className="small">
                        Direct uploads are currently unavailable. Submit Drive
                        file or folder links above; all file formats can be
                        shared that way.
                      </p>
                    )}
                    <label>
                      A short note (optional)
                      <textarea name="notes" maxLength={2000} />
                    </label>
                    <button className="btn-primary" disabled={busy}>
                      {busy ? "Saving your work…" : "Submit task"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="notice">
                  Your application is saved. No task round is currently open for
                  this account. Check the status and timings below.
                </p>
              )}
              <h2 className="mt-10">Your applications & work</h2>
              {applications.map((a) => (
                <article key={a.id}>
                  <strong>{a.role}</strong>
                  <p>Status: {a.status.replaceAll("_", " ")}</p>
                  <p>
                    {roundState(a, now) === "waiting"
                      ? "Application received — waiting for a task invitation."
                      : roundState(a, now) === "scheduled"
                        ? `Task round opens ${roundDate(a.task_opens_at)}.`
                        : roundState(a, now) === "expired"
                          ? `Task round closed on ${roundDate(a.task_deadline)}. New submissions are disabled.`
                          : roundState(a, now) === "closed"
                            ? "This round is closed."
                            : `Task round open until ${roundDate(a.task_deadline)}.`}
                  </p>
                  {a.task_brief && (
                    <p className="whitespace-pre-wrap">{a.task_brief}</p>
                  )}
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
          ) : null}
        </>
      ) : (
        <form onSubmit={apply} onInvalidCapture={invalid}>
          {applications.length > 0 && (
            <div className="notice">
              <strong>Your saved applications</strong>
              {applications.map((a) => (
                <p key={a.id}>
                  {a.role} — {a.status.replaceAll("_", " ")} · Reference: {a.id}
                </p>
              ))}
              <a href="/careers/tasks">View your task round</a>
            </div>
          )}
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
