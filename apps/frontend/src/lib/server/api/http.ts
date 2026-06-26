import { error, fail, isHttpError, type ActionFailure } from "@sveltejs/kit";

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        camelize(v),
      ]),
    );
  }
  return value;
}

export async function unwrap<T>(res: Response): Promise<T | null> {
  if (res.status === 204) return null;
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw error(res.status, errorMessage(res.status));
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return camelize(JSON.parse(text)) as T;
  } catch {
    throw error(502, "Received non-JSON response from server");
  }
}

export function errorMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request could not be completed.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You do not have access to that action.";
    case 404:
      return "Not found.";
    case 409:
      return "The request conflicts with existing data.";
    case 413:
      return "The request is too large.";
    case 429:
      return "Too many requests. Please try again later.";
    case 502:
    case 503:
    case 504:
      return "The service is temporarily unavailable.";
    default:
      return "The request failed.";
  }
}

export function failFromError(
  e: unknown,
  fallback: string,
  overrides?: Record<number, string>,
): ActionFailure<{ error: string }> {
  if (isHttpError(e)) {
    return fail(e.status, {
      error: overrides?.[e.status] ?? errorMessage(e.status),
    });
  }
  return fail(500, { error: fallback });
}
