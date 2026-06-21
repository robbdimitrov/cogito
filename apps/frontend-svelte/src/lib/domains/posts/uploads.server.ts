import { apiRequest, type ServerFetch } from "$lib/shared/transport.server";

interface UploadResponse {
  filename: string;
}

interface UploadedImage {
  key: string;
}

export async function uploadImage(
  fetch: ServerFetch,
  file: File,
): Promise<UploadedImage> {
  const body = new FormData();
  body.append("image", file, file.name);

  const { filename } = await apiRequest<UploadResponse>(fetch, "/api/uploads", {
    method: "POST",
    body,
  });
  return { key: filename };
}
