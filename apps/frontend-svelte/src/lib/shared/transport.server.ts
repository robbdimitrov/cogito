import { camelizeKeys } from "$lib/shared/mappers";

export type ServerFetch = typeof globalThis.fetch;

export class APIError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export async function apiRequest<T>(
  fetch: ServerFetch,
  url: string,
  init?: RequestInit,
): Promise<T> {
  return (await apiResponse<T>(fetch, url, init)).data;
}

export async function apiResponse<T>(
  fetch: ServerFetch,
  url: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new APIError(504, "Backend request timed out");
    }
    if (error instanceof TypeError) {
      throw new APIError(503, "Backend service unavailable");
    }
    throw error;
  }
  if (response.status === 204) {
    return { data: undefined as T, response };
  }

  const text = await response.text();
  if (!response.ok) {
    throw new APIError(response.status, errorMessage(response.status, text));
  }
  if (!text) {
    return { data: undefined as T, response };
  }

  try {
    return { data: camelizeKeys(JSON.parse(text)) as T, response };
  } catch {
    throw new APIError(502, "Received non-JSON response from server");
  }
}

export function jsonRequest(
  method: "POST" | "PUT",
  body: unknown,
): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function errorMessage(status: number, text: string): string {
  const fallback = `Request failed with status ${status}`;
  if (!text) {
    return fallback;
  }

  try {
    const parsed = camelizeKeys(JSON.parse(text));
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return parsed.message;
    }
  } catch {
    return text.trim() || fallback;
  }

  return fallback;
}
