import React, { useEffect, useState, useRef } from "react";
import { careerRequest as api, roundState, roundDate } from "../../lib/careers";
import { supabase } from "../../lib/supabase";
import { CAREER_ROLES } from "../../config/commerce";
import { CAREER_TASKS } from "../../data/careerTasks";

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
  const [activeTaskPreview, setActiveTaskPreview] = useState<string>("Content & social media");

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
  const selectedTaskDef = selected ? CAREER_TASKS[selected.role] : null;

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
              <a href="/careers">Apply here first</a>.
            </p>
          ) : applications.length ? (
            <>
              {openApps.length > 0 ? (
                <>
                  <div className="notice">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <strong className="text-lg">🎯 Task Round Open: {selected.role}</strong>
                      <span className="text-sm font-semibold px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded">
                        Deadline: {roundDate(selected.task_deadline)}
                      </span>
                    </div>

                    <p role="timer" aria-live="off" className="font-mono text-base font-bold my-2 text-stone-800 dark:text-stone-100">
                      ⏳ Time remaining:{" "}
                      {formatRemaining(
                        Math.max(0, Date.parse(selected.task_deadline) - now),
                      )}
                    </p>

                    {/* Detailed Task Guidelines */}
                    {selectedTaskDef && (
                      <div className="task mt-4 text-left border-l-4 border-stone-600 pl-4 py-2 bg-stone-100 dark:bg-stone-900/60 rounded">
                        <h3 className="font-semibold text-base mb-1">{selectedTaskDef.title}</h3>
                        <p className="small mb-3 text-stone-600 dark:text-stone-400">{selectedTaskDef.subtitle}</p>

                        <div className="mb-3">
                          <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Objective:</strong>
                          <p className="text-sm mt-0.5">{selectedTaskDef.objective}</p>
                        </div>

                        <div className="mb-3">
                          <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Detailed Instructions:</strong>
                          <ul className="text-sm mt-1 space-y-1 pl-4 list-disc">
                            {selectedTaskDef.instructions.map((ins, i) => (
                              <li key={i}>{ins}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Expected Deliverables:</strong>
                          <ul className="text-sm mt-1 space-y-1 pl-4 list-disc">
                            {selectedTaskDef.deliverables.map((del, i) => (
                              <li key={i}>{del}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {selected.task_brief && (
                      <div className="task mt-3 text-left bg-stone-50 dark:bg-stone-900/40 p-3 rounded border border-stone-200 dark:border-stone-800">
                        <strong className="text-xs uppercase tracking-wider block text-stone-500 mb-1">Additional Notes from Team:</strong>
                        <p className="whitespace-pre-wrap text-sm">{selected.task_brief}</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={submit} className="mt-6">
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
                        placeholder={
                          selected.role === "Content & social media"
                            ? "e.g. CUMID Brand Reel (Concept & Drive Link)"
                            : "e.g. Pocket Diary Cover Art / Feature Submission"
                        }
                      />
                    </label>

                    <label>
                      Links to your work
                      <textarea
                        name="links"
                        required
                        placeholder={"One HTTPS link per line, e.g.:\nhttps://drive.google.com/...\nhttps://github.com/...\nhttps://www.figma.com/..."}
                        maxLength={12000}
                        rows={4}
                      />
                    </label>
                    <p className="small">
                      Share viewable links to your work (Google Drive, Figma, GitHub, Notion, Loom, or YouTube). If sharing a Google Drive video or folder, make sure 'Anyone with the link can view' is enabled. No file uploads needed!
                    </p>

                    <label>
                      Notes & walkthrough details (optional)
                      <textarea
                        name="notes"
                        maxLength={2000}
                        placeholder="Explain your approach, hook rationale, caption + audio suggestions, or tech choices..."
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

                  {/* Task Instructions preview */}
                  {CAREER_TASKS[a.role] && (
                    <div className="task my-2 text-left">
                      <strong className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                        Task Brief ({a.role}): {CAREER_TASKS[a.role].title}
                      </strong>
                      <p className="text-sm">{CAREER_TASKS[a.role].objective}</p>
                    </div>
                  )}

                  {a.task_brief && (
                    <div className="task my-2 text-left">
                      <strong className="block mb-1 text-xs uppercase tracking-wider text-stone-500">Admin Instructions:</strong>
                      <p className="whitespace-pre-wrap text-sm">{a.task_brief}</p>
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
        <>
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
              <select
                name="role"
                required
                onChange={(e) => {
                  if (e.target.value && CAREER_TASKS[e.target.value]) {
                    setActiveTaskPreview(e.target.value);
                  }
                }}
              >
                <option value="">Choose an area</option>
                {CAREER_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
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

          {/* Detailed Task Instructions Guide for Applicants */}
          <div className="mt-12 text-left border-t border-stone-200 dark:border-stone-800 pt-8">
            <h2 className="text-xl font-bold mb-2">📋 Task Round Guidelines by Role</h2>
            <p className="small mb-4 text-stone-600 dark:text-stone-400">
              When your application is selected, you will be invited to complete a short, focused task round. Below are the detailed instructions and deliverables for each role:
            </p>

            <div className="flex gap-2 flex-wrap mb-4">
              {CAREER_ROLES.map((role) => (
                <button
                  type="button"
                  key={role}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeTaskPreview === role
                      ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                  onClick={() => setActiveTaskPreview(role)}
                >
                  {role}
                </button>
              ))}
            </div>

            {CAREER_TASKS[activeTaskPreview] && (
              <div className="notice p-5 bg-stone-100 dark:bg-stone-900 rounded-lg">
                <h3 className="font-bold text-base mb-1">{CAREER_TASKS[activeTaskPreview].title}</h3>
                <p className="small text-stone-600 dark:text-stone-400 mb-3">{CAREER_TASKS[activeTaskPreview].subtitle}</p>

                <div className="mb-3">
                  <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Objective:</strong>
                  <p className="text-sm mt-0.5">{CAREER_TASKS[activeTaskPreview].objective}</p>
                </div>

                <div className="mb-3">
                  <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Instructions:</strong>
                  <ul className="text-sm mt-1 space-y-1 pl-4 list-disc">
                    {CAREER_TASKS[activeTaskPreview].instructions.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong className="text-xs uppercase tracking-wider block text-stone-700 dark:text-stone-300">Deliverables to Link:</strong>
                  <ul className="text-sm mt-1 space-y-1 pl-4 list-disc">
                    {CAREER_TASKS[activeTaskPreview].deliverables.map((del, i) => (
                      <li key={i}>{del}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
