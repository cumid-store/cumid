import { useEffect, useState } from "react";
import { careerRequest as api } from "../../../lib/careers";
import { CAREER_TASKS, DEFAULT_TASK_ROUND_DEADLINE_INPUT } from "../../../data/careerTasks";
import AdminLayout from "./AdminLayout";

const istInput = (value?: string) => {
  const d = new Date(Date.parse(value || new Date().toISOString()) + 330 * 60000);
  return d.toISOString().slice(0, 16);
};

const toIstIso = (val: string) => {
  const clean = val.trim();
  if (!clean) return "";
  const parts = clean.split(":");
  const withSecs = parts.length === 2 ? `${clean}:00` : clean;
  return new Date(`${withSecs}+05:30`).toISOString();
};

export default function AdminCareers() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [briefDrafts, setBriefDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      setItems(await api("admin/careers?page=" + page));
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <AdminLayout
      activeTab="careers"
      title="Applications & tasks"
      subtitle="Recruitment portal & task round manager"
    >
      <div className="commerce-form">
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <p className="small">
          Candidate work is submitted via links (Drive, Figma, GitHub, etc.) to keep database operations fast, reliable, and strictly free tier.
        </p>

        {loading ? (
          <p>Loading applications…</p>
        ) : (
          items.map((a) => {
            const roleTask = CAREER_TASKS[a.role];
            const currentBrief =
              briefDrafts[a.id] !== undefined
                ? briefDrafts[a.id]
                : a.task_brief ||
                  (roleTask
                    ? `${roleTask.title}\n\nObjective: ${roleTask.objective}\n\nInstructions:\n${roleTask.instructions.join("\n")}\n\nDeliverables:\n${roleTask.deliverables.join("\n")}`
                    : "");

            return (
              <article key={a.id}>
                <h2>
                  {a.name} · {a.role}
                </h2>
                <a href={"mailto:" + a.email} className="text-sm underline block mb-2">
                  {a.email}
                </a>
                <p className="whitespace-pre-wrap">{a.introduction}</p>

                {a.links && a.links.length > 0 && (
                  <div className="my-2">
                    <strong className="text-xs uppercase tracking-wider block text-stone-500">
                      Portfolio / Profile Links:
                    </strong>
                    <ul className="space-y-1 my-1">
                      {a.links.map((l: string) => (
                        <li key={l}>
                          <a
                            href={l}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="underline break-all inline-flex items-center gap-1"
                          >
                            <span>🔗</span> <span>{l}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <label className="mt-4">
                  Application Status
                  <select
                    value={a.status}
                    onChange={async (e) => {
                      try {
                        await api("admin/careers", {
                          id: a.id,
                          status: e.target.value,
                        });
                        setMessage("Application status updated.");
                        await load();
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                  >
                    {[
                      "received",
                      "reviewing",
                      "task_sent",
                      "shortlisted",
                      "closed",
                    ].map((s) => (
                      <option value={s} key={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>

                <form
                  className="task mt-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    setError("");
                    setMessage("");
                    const form = new FormData(event.currentTarget);
                    try {
                      const opensRaw = String(form.get("opens") || "");
                      const deadlineRaw = String(form.get("deadline") || "");
                      const brief = String(form.get("brief") || "").trim();

                      if (!brief) throw new Error("Please enter task instructions.");
                      if (!opensRaw || !deadlineRaw)
                        throw new Error("Please specify opening time and deadline.");

                      const opensIso = toIstIso(opensRaw);
                      const deadlineIso = toIstIso(deadlineRaw);

                      if (Date.parse(deadlineIso) <= Date.parse(opensIso)) {
                        throw new Error("Deadline must be after opening time.");
                      }
                      if (Date.parse(deadlineIso) <= Date.now()) {
                        throw new Error("Deadline must be in the future.");
                      }

                      await api("admin/careers", {
                        id: a.id,
                        status: "task_sent",
                        round: {
                          opensAt: opensIso,
                          deadline: deadlineIso,
                          brief,
                        },
                      });
                      setMessage(
                        "Task round saved! The candidate can now view instructions and submit work links in their portal.",
                      );
                      await load();
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="font-semibold text-base">Timed task round ({a.role})</h3>
                    {roleTask && (
                      <button
                        type="button"
                        className="text-xs px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded underline"
                        onClick={() => {
                          const template = `${roleTask.title}\n\nObjective: ${roleTask.objective}\n\nInstructions:\n${roleTask.instructions.join("\n")}\n\nDeliverables:\n${roleTask.deliverables.join("\n")}`;
                          setBriefDrafts((prev) => ({ ...prev, [a.id]: template }));
                        }}
                      >
                        Insert standard task brief template
                      </button>
                    )}
                  </div>

                  <label>
                    Task instructions
                    <textarea
                      name="brief"
                      maxLength={4000}
                      required
                      rows={5}
                      value={currentBrief}
                      onChange={(e) =>
                        setBriefDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))
                      }
                      placeholder="Enter clear instructions, requirements, deliverables, and submission expectations..."
                    />
                  </label>

                  <div className="form-grid">
                    <label>
                      Opens (IST)
                      <input
                        name="opens"
                        type="datetime-local"
                        required
                        defaultValue={istInput(a.task_opens_at)}
                      />
                    </label>
                    <label>
                      Deadline (IST)
                      <input
                        name="deadline"
                        type="datetime-local"
                        required
                        defaultValue={
                          a.task_deadline
                            ? istInput(a.task_deadline)
                            : DEFAULT_TASK_ROUND_DEADLINE_INPUT
                        }
                      />
                    </label>
                  </div>
                  <p className="small">
                    The deadline is enforced on the server for link submissions. Choose Closed above to stop the round early, or extend the deadline here if needed.
                  </p>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving round…" : "Open / schedule task round"}
                  </button>
                </form>

                {a.career_submissions && a.career_submissions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-stone-600 mb-2">
                      Candidate Submissions ({a.career_submissions.length}):
                    </h4>
                    {a.career_submissions.map((s: any) => (
                      <div className="task mb-3" key={s.id}>
                        <strong>{s.title}</strong>
                        {s.notes && <p className="my-1">{s.notes}</p>}
                        <p className="small">
                          Submitted:{" "}
                          {new Date(s.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          IST
                        </p>
                        <ul className="mt-2 space-y-1">
                          {s.links?.map((l: string) => (
                            <li key={l}>
                              <a
                                href={l}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline break-all inline-flex items-center gap-1.5"
                              >
                                <span>🔗</span> <span>{l}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}

        {!loading && !items.length && <p>No applications on this page.</p>}
        <div className="actions">
          <button
            disabled={page === 0 || loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={items.length < 20 || loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
