import type { Session } from "./model";
import {
  apiRequest,
  apiResponse,
  jsonRequest,
  type ServerFetch,
} from "$lib/shared/transport.server";

export interface LoginResult {
  id: number;
  setCookies: string[];
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
): Promise<LoginResult> {
  return apiResponse<{ id: number }>(
    fetch,
    "/api/sessions",
    jsonRequest("POST", { email, password }),
  ).then(({ data, response }) => {
    const setCookies = response.headers.getSetCookie();
    const fallback = response.headers.get("set-cookie");
    return {
      id: data.id,
      setCookies:
        setCookies.length > 0 ? setCookies : fallback ? [fallback] : [],
    };
  });
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
