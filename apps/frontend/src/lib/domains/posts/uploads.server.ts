import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

interface UploadResponse {
  filename: string;
}

interface UploadedImage {
  key: string;
}

export async function uploadImage(
  api: ApiClient,
  file: File,
): Promise<UploadedImage> {
  const body = new FormData();
  body.append("image", file, file.name);

  const res = await api("/uploads", {
    method: "POST",
    body,
  });
  const unwrapped = await unwrap<UploadResponse>(res);
  return { key: unwrapped!.filename };
}
