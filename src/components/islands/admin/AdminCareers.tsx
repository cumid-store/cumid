import { useEffect, useState } from "react";
import { careerRequest as api } from "../../../lib/careers";
import { supabase } from "../../../lib/supabase";
import AdminLayout from "./AdminLayout";
const istInput = (value?: string) =>
  new Date(Date.parse(value || new Date().toISOString()) + 330 * 60000)
    .toISOString()
    .slice(0, 16);
export default function AdminCareers() {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
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
  async function download(id: string, name: string) {
    try {
      const { data } = await supabase!.auth.getSession();
      const r = await fetch("/api/admin/file?id=" + id, {
        headers: { Authorization: "Bearer " + data.session?.access_token },
      });
      if (!r.ok) throw Error("Download failed.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <AdminLayout
      activeTab="careers"
      title="Applications & tasks"
      subtitle="Private recruitment inbox"
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
          Files are untrusted candidate uploads. Download only when needed; do
          not run executable files. Work is submitted for evaluation, not
          automatic commercial use.
        </p>
        {loading ? (
          <p>Loading applications…</p>
        ) : (
          items.map((a) => (
            <article key={a.id}>
              <h2>
                {a.name} · {a.role}
              </h2>
              <a href={"mailto:" + a.email}>{a.email}</a>
              <p>{a.introduction}</p>
              <ul>
                {a.links.map((l: string) => (
                  <li key={l}>
                    <a href={l} rel="noopener noreferrer" target="_blank">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
              <label>
                Status
                <select
                  value={a.status}
                  onChange={async (e) => {
                    try {
                      await api("admin/careers", {
                        id: a.id,
                        status: e.target.value,
                      });
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
                className="task"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setSaving(true);
                  setError("");
                  setMessage("");
                  const form = new FormData(event.currentTarget);
                  try {
                    await api("admin/careers", {
                      id: a.id,
                      status: "task_sent",
                      round: {
                        opensAt: new Date(
                          String(form.get("opens")) + ":00+05:30",
                        ).toISOString(),
                        deadline: new Date(
                          String(form.get("deadline")) + ":00+05:30",
                        ).toISOString(),
                        brief: form.get("brief"),
                      },
                    });
                    setMessage(
                      "Task round saved. The candidate can see the instructions and deadline in their task portal.",
                    );
                    await load();
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <h3 className="font-semibold">Timed task round</h3>
                <label>
                  Task instructions
                  <textarea
                    name="brief"
                    maxLength={4000}
                    required
                    defaultValue={a.task_brief || ""}
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
                        a.task_deadline ? istInput(a.task_deadline) : ""
                      }
                    />
                  </label>
                </div>
                <p className="small">
                  The deadline is enforced on the server for links and file
                  uploads. Choose Closed above to stop the round early. Extend
                  the deadline here if needed.
                </p>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving round…" : "Open / schedule task round"}
                </button>
              </form>
              {a.career_submissions.map((s: any) => (
                <div className="task" key={s.id}>
                  <strong>{s.title}</strong>
                  <p>{s.notes}</p>
                  <ul>
                    {s.links.map((l: string) => (
                      <li key={l}>
                        <a href={l} target="_blank" rel="noopener noreferrer">
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {s.career_files
                    .filter((f: any) => f.state === "uploaded")
                    .map((f: any) => (
                      <p key={f.id}>
                        <button
                          onClick={() => download(f.id, f.name)}
                          className="underline"
                        >
                          Download {f.name}
                        </button>{" "}
                        ({Math.ceil(f.size / 1024)} KB)
                      </p>
                    ))}
                </div>
              ))}
            </article>
          ))
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
