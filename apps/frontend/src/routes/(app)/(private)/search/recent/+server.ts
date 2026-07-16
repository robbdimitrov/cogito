import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { apiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

const VALID_TYPES = new Set(["users", "hashtags", "queries"]);
const MAX_REFERENCE_CHARS = 255;
const MAX_BODY_BYTES = 1024;

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    throw error(413, "Request body is too large.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw error(400, "Malformed JSON request body.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      throw error(413, "Request body is too large.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw error(400, "Malformed JSON request body.");
  }
}

export const POST: RequestHandler = async (event) => {
  if (!event.cookies.get("session")) return new Response(null, { status: 401 });

  const body = await readBoundedJson(event.request);
  const { type, reference: rawReference } = (body ?? {}) as {
    type?: unknown;
    reference?: unknown;
  };
  const normalizedType = typeof type === "string" ? type.trim() : "";
  const reference = typeof rawReference === "string" ? rawReference.trim() : "";
  if (
    !normalizedType ||
    !VALID_TYPES.has(normalizedType) ||
    !reference ||
    [...reference].length > MAX_REFERENCE_CHARS
  ) {
    throw error(400, "Invalid recent search.");
  }

  await unwrap<null>(
    await apiClient(event)("/search/recent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: normalizedType, reference }),
    }),
  );
  return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
  if (!event.cookies.get("session")) return new Response(null, { status: 401 });
  await unwrap<null>(
    await apiClient(event)("/search/recent", { method: "DELETE" }),
  );
  return new Response(null, { status: 204 });
};
