export function recordRecentSearch(
  type: "users" | "hashtags" | "queries",
  reference: string,
): void {
  fetch("/search/recent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, reference }),
  }).catch(() => {});
}
