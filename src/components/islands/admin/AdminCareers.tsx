import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import AdminLayout from "./AdminLayout";
export default function AdminCareers() {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true);
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
