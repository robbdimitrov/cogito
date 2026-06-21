import { error } from "@sveltejs/kit";
import { camelizeKeys } from "$lib/shared/mappers";

export async function unwrap<T>(res: Response): Promise<T | null> {
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw error(res.status, errorMessage(res.status, text));
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return camelizeKeys(JSON.parse(text)) as T;
  } catch {
    throw error(502, "Received non-JSON response from server");
  }
}

function errorMessage(status: number, text: string): string {
  const fallback = `HTTP ${status}`;
  if (!text) return fallback;

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
