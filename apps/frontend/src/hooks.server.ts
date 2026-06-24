import type { Handle, HandleServerError } from "@sveltejs/kit";
import { parseTheme } from "$lib/shared/theme";

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
