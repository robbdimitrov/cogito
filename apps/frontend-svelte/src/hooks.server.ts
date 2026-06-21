import { env } from "$env/dynamic/private";
import type { Handle, HandleFetch, HandleServerError } from "@sveltejs/kit";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
  const cookie = event.request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (MUTATING_METHODS.has(request.method)) {
    const csrfToken = event.cookies.get("_csrf");
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  return fetch(new Request(target, new Request(request, { headers })));
};

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
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
