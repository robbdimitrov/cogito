import { env } from "$env/dynamic/private";
import { bridgeBackendCookies } from "$lib/shared/backendCookies.server";
import { parseTheme } from "$lib/shared/theme";
import type { Handle, HandleFetch, HandleServerError } from "@sveltejs/kit";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_BACKEND_TIMEOUT_MS = 10_000;

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
  const requestURL = new URL(request.url);
  if (
    requestURL.origin !== event.url.origin ||
    !requestURL.pathname.startsWith("/api/")
  ) {
    return fetch(request);
  }

  if (!env.BACKEND_URL) {
    throw new Error("BACKEND_URL is required");
  }

  const target = new URL(
    requestURL.pathname.slice("/api".length) + requestURL.search,
    env.BACKEND_URL,
  );
  const headers = new Headers(request.headers);
  const timeout = AbortSignal.timeout(backendTimeoutMS());
  const signal = AbortSignal.any([request.signal, timeout]);

  if (MUTATING_METHODS.has(request.method)) {
    let csrfToken = event.cookies.get("_csrf");
    if (!csrfToken) {
      const bootstrapHeaders = new Headers();
      const cookie = request.headers.get("cookie");
      if (cookie) bootstrapHeaders.set("cookie", cookie);

      const bootstrapResponse = await fetch(
        new Request(new URL("/", env.BACKEND_URL), {
          headers: bootstrapHeaders,
          signal,
        }),
      );
      bridgeBackendCookies(event.cookies, bootstrapResponse.headers);
      if (!bootstrapResponse.ok) {
        return bootstrapResponse;
      }
      await bootstrapResponse.body?.cancel();
      csrfToken = event.cookies.get("_csrf");
    }

    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
      headers.set(
        "cookie",
        setCookie(headers.get("cookie"), "_csrf", csrfToken),
      );
    }
  }

  const response = await fetch(
    new Request(target, new Request(request, { headers, signal })),
  );
  bridgeBackendCookies(event.cookies, response.headers);
  return response;
};

export const handle: Handle = async ({ event, resolve }) => {
  const theme = parseTheme(event.cookies.get("theme"));
  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('data-theme="system"', `data-theme="${theme}"`),
  });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
};

export const handleError: HandleServerError = ({
  error,
  event,
  status,
  message,
}) => {
  console.error("Unhandled server error", {
    method: event.request.method,
    route: event.route.id,
    status,
    error: error instanceof Error ? error.name : "UnknownError",
  });

  return { message };
};

function backendTimeoutMS(): number {
  const configured = Number(env.BACKEND_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_BACKEND_TIMEOUT_MS;
}

function setCookie(header: string | null, name: string, value: string): string {
  const cookies = (header ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie && !cookie.startsWith(`${name}=`));
  cookies.push(`${name}=${value}`);
  return cookies.join("; ");
}
