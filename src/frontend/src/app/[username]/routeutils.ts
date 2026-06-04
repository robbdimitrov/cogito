export function normalizeUsername(username: string) {
  return decodeURIComponent(username).replace(/^@/, '');
}
