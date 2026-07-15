import type { RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { parseSetCookie } from "set-cookie-parser";
import type { CookieSerializeOptions } from "cookie";

/** A backend-bound fetch: a backend-relative path plus the standard `RequestInit`. */
export type ApiClient = (path: string, init?: RequestInit) => Promise<Response>;

const backendBase = (): string => env.BACKEND_URL ?? "http://localhost:8080";
const backendTimeoutMs = (): number => {
  const configured = Number(env.BACKEND_TIMEOUT_MS ?? "10000");
  return Number.isFinite(configured) && configured > 0 ? configured : 10000;
};

function composeAbortSignals(
  timeoutMs: number,
  callerSignal?: AbortSignal | null,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) return timeout;
  if (callerSignal.aborted) return callerSignal;
  return AbortSignal.any([callerSignal, timeout]);
}

// event.fetch only auto-relays Set-Cookie for same-origin targets; BACKEND_URL
// is a cross-origin internal address, so we relay it ourselves here.
function forwardSetCookies(
  response: Response,
  cookies: RequestEvent["cookies"],
): void {
  for (const { name, value, ...options } of parseSetCookie(response, {
    decodeValues: false,
  })) {
    cookies.set(name, value, {
      path: "/",
      encode: (v) => v,
      // gateway-controlled input; trust its SameSite value over the wider inferred type
      ...(options as CookieSerializeOptions),
    });
  }
}

/**
 * Per-request BFF client: resolves backend-relative paths against `BACKEND_URL`
 * and forwards the session cookie. Runs only server-side, so these calls never
 * involve CORS; `connect-src 'self'` keeps the browser off the backend.
 */
export function apiClient(
  event: Pick<RequestEvent, "fetch" | "cookies">,
): ApiClient {
  return async (path, init) => {
    const headers = new Headers(init?.headers);
    // Read per call to honour a session set earlier in the same request.
    const session = event.cookies.get("session");
    if (session) headers.set("cookie", `session=${session}`);
    const response = await event.fetch(new URL(path, backendBase()), {
      ...init,
      headers,
      signal: composeAbortSignals(backendTimeoutMs(), init?.signal),
    });
    forwardSetCookies(response, event.cookies);
    return response;
  };
}
