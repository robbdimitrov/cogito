export function getSafeUploadUrl(key?: string | null): string {
  if (!key) return '';
  if (!/^[a-zA-Z0-9-_.]+$/.test(key)) {
    console.warn('Invalid upload key format:', key);
    return '';
  }
  return `/api/uploads/${key}`;
}
