import React, { useEffect, useState, useRef } from "react";
import { careerRequest as api, roundState, roundDate } from "../../lib/careers";
import { supabase } from "../../lib/supabase";
import { CAREER_ROLES } from "../../config/commerce";

const parseLinks = (s: FormDataEntryValue | null) =>
  String(s || "")
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(l) ? l : `https://${l}`));

function formatRemaining(ms: number) {
  if (ms <= 0) return "00h 00m 00s (Deadline reached)";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export default function Careers({ portal = false }: { portal?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [clockOffset, setClockOffset] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [syncError, setSyncError] = useState("");

  const feedback = useRef<HTMLDivElement>(null);
  const refreshVersion = useRef(0);

  async function refresh() {
    const version = ++refreshVersion.current;
    const result = await api("careers/applications");
    if (version !== refreshVersion.current) return;
    setApplications(Array.isArray(result) ? result : result.applications || []);
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
    try {
      const externalLinks = parseLinks(data.get("links"));
      if (!externalLinks.length) {
        throw new Error(
          "Please add at least one link to your work (e.g. Google Drive, Figma, GitHub, Notion).",
        );
      }
      if (externalLinks.length > 10) {
        throw new Error("You can submit up to 10 links per submission.");
      }
      const title = String(data.get("title") || "").trim();
      if (!title) {
        throw new Error("Please enter a task name or title.");
      }
      await api("careers/submissions", {
        applicationId: data.get("applicationId"),
        title,
        notes: String(data.get("notes") || "").trim(),
        links: externalLinks,
      });
      setMessage("Your task work has been submitted successfully. Thank you!");
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
                      {formatRemaining(
                        Math.max(0, Date.parse(selected.task_deadline) - now),
                      )}
                    </p>
                    {selected.task_brief && (
                      <p className="whitespace-pre-wrap">{selected.task_brief}</p>
                    )}
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
                      Task name / title
                      <input
                        name="title"
                        required
                        maxLength={160}
                        placeholder="e.g. Design Concepts / Instagram Reel / Code Submission"
                      />
                    </label>
                    <label>
                      Links to your work
                      <textarea
                        name="links"
                        required
                        placeholder={"One link per line, e.g.:\nhttps://drive.google.com/...\nhttps://github.com/...\nhttps://www.figma.com/..."}
                        maxLength={12000}
                        rows={4}
                      />
                    </label>
                    <p className="small">
                      Share links to your work (Google Drive, Figma, GitHub, Notion, Loom, or website). If sharing a private Google Drive or Figma file, make sure anyone with the link can view or share view access with support@cumid.store.
                    </p>
                    <label>
                      A short note (optional)
                      <textarea
                        name="notes"
                        maxLength={2000}
                        placeholder="Add any notes, walkthrough details, or comments for the reviewers..."
                      />
                    </label>
                    <button className="btn-primary" disabled={busy}>
                      {busy ? "Saving your work…" : "Submit task work"}
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
                    <div className="task my-2">
                      <strong className="block mb-1 text-sm">Task Instructions:</strong>
                      <p className="whitespace-pre-wrap">{a.task_brief}</p>
                    </div>
                  )}
                  <small>Application: {a.id}</small>

                  {a.career_submissions?.map((s: any) => (
                    <div className="task" key={s.id}>
                      <strong>{s.title}</strong>
                      {s.notes && <p>{s.notes}</p>}
                      <small>
                        Submitted on{" "}
                        {new Date(s.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                      <ul className="mt-2 space-y-1">
                        {s.links?.map((link: string) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all inline-flex items-center gap-1.5 underline"
                            >
                              <span>🔗</span>
                              <span>{link}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
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
              <a href="/careers/tasks">View your task round →</a>
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
            Portfolio / CV / Work links (optional)
            <textarea
              name="links"
              maxLength={12000}
              placeholder="One HTTPS link per line"
            />
          </label>
          <p className="small">
            No long cover letter needed. We use the email from your Google
            account. Share view access with support@cumid.store for private
            links.
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
