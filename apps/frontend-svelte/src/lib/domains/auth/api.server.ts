import type { Session } from "./model";
import {
  apiRequest,
  jsonRequest,
  type ServerFetch,
} from "$lib/shared/transport.server";

interface LoginResponse {
  id: number;
}

export interface SessionsResponse {
  sessions: Session[];
  currentSessionId: string;
  userId?: string;
}

export function login(
  fetch: ServerFetch,
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiRequest(
    fetch,
    "/api/sessions",
    jsonRequest("POST", { email, password }),
  );
}

export function logout(fetch: ServerFetch): Promise<void> {
  return apiRequest(fetch, "/api/sessions", { method: "DELETE" });
}

export function getSessions(fetch: ServerFetch): Promise<SessionsResponse> {
  return apiRequest(fetch, "/api/sessions");
}

export function deleteSession(
  fetch: ServerFetch,
  sessionID: string,
): Promise<void> {
  return apiRequest(fetch, `/api/sessions/${encodeURIComponent(sessionID)}`, {
    method: "DELETE",
  });
}
