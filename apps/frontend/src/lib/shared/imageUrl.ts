export type ImageSize = "thumb";

export function imageUrl(key: string, size?: ImageSize): string {
  return size ? `/uploads/${key}?size=${size}` : `/uploads/${key}`;
}
