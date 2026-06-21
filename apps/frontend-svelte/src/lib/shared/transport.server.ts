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
  const response = await fetch(url, init);
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new APIError(response.status, errorMessage(response.status, text));
  }
  if (!text) {
    return undefined as T;
  }

  try {
    return camelizeKeys(JSON.parse(text)) as T;
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
