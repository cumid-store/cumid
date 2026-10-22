import { supabase } from "./supabase";
export async function api(path: string, data?: unknown, method?: string) {
  const { data: session } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const response = await fetch("/api/" + path, {
    method: method || (data ? "POST" : "GET"),
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(session.session
        ? { Authorization: "Bearer " + session.session.access_token }
        : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not complete the request.");
  return result;
}
export async function uploadCareerFile(submission: string, file: File) {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch(
    "/api/careers/upload?submission=" + encodeURIComponent(submission),
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + data.session?.access_token,
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Upload failed. Use a Drive link.");
  return result;
}
