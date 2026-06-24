import type { Session } from "./model";
import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

export interface SessionsResponse {
  sessions: Session[];
  currentSessionId: string;
  userId?: string;
}

export async function login(
  api: ApiClient,
  email: string,
  password: string,
): Promise<void> {
  const res = await api("/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await unwrap<unknown>(res);
}

export async function logout(api: ApiClient): Promise<void> {
  const res = await api("/sessions", { method: "DELETE" });
  await unwrap<null>(res);
}

export async function getSessions(api: ApiClient): Promise<SessionsResponse> {
  const res = await api("/sessions");
  const unwrapped = await unwrap<SessionsResponse>(res);
  return unwrapped!;
}

export async function deleteSession(
  api: ApiClient,
  sessionID: string,
): Promise<void> {
  const res = await api(`/sessions/${encodeURIComponent(sessionID)}`, {
    method: "DELETE",
  });
  await unwrap<null>(res);
}
