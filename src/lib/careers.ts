import { supabase } from "./supabase";
export function roundState(
  app: any,
  now = Date.now(),
): "waiting" | "scheduled" | "open" | "expired" | "closed" {
  if (app.status === "closed" || app.status === "shortlisted") return "closed";
  if (app.status !== "task_sent" || !app.task_opens_at || !app.task_deadline)
    return "waiting";
  const start = Date.parse(app.task_opens_at),
    end = Date.parse(app.task_deadline);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return "waiting";
  if (now >= end) return "expired";
  if (now < start) return "scheduled";
  return "open";
}
export const roundDate = (s: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(s)) + " IST";
export async function careerRequest(path: string, data?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const session = await Promise.race([
      supabase?.auth.getSession(),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener(
          "abort",
          () =>
            reject(new Error("Session check timed out. Please sign in again.")),
          { once: true },
        ),
      ),
    ]);
    if (!session?.data.session)
      throw new Error(
        "Please sign in again to continue. Your form has been kept.",
      );
    const response = await fetch("/api/" + path, {
      method: data ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + session.data.session.access_token,
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The application service is unavailable. Your form has been kept. Check My applications before retrying.",
      );
    }
    if (!response.ok)
      throw new Error(
        result.error ||
          "We could not confirm this request. Check My applications before retrying.",
      );
    return result;
  } catch (error: any) {
    if (controller.signal.aborted)
      throw new Error(
        "We could not confirm the result in time. Your form has been kept. Refresh My applications before retrying; an earlier request may have been saved.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
