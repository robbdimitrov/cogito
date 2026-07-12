import { activeToken, type ActiveToken } from "$lib/shared/activeToken";

const DEBOUNCE_MS = 150;

export function createTypeaheadController() {
  let items = $state<unknown[]>([]);
  let token = $state<ActiveToken | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let requestID = 0;

  async function fetchSuggestions(forToken: ActiveToken, id: number) {
    const type = forToken.trigger === "@" ? "users" : "hashtags";
    const path = `/api/${type}/search?query=${encodeURIComponent(forToken.query)}&limit=5`;
    try {
      const res = await fetch(path);
      if (id !== requestID) return;
      const page = res.ok ? ((await res.json()) as { items?: unknown[] }) : {};
      items = page.items ?? [];
    } catch {
      if (id === requestID) items = [];
    }
  }

  function handleInput(value: string, caret: number) {
    const next = activeToken(value, caret);
    token = next;
    requestID++;
    clearTimeout(debounceTimer);
    if (next && next.query.length > 0) {
      const id = requestID;
      debounceTimer = setTimeout(() => fetchSuggestions(next, id), DEBOUNCE_MS);
    } else {
      items = [];
    }
  }

  function displayItem(item: unknown): string {
    if (token?.trigger === "@") {
      return (item as { username: string }).username;
    }
    return (item as { name: string }).name;
  }

  function select(
    text: string,
    selected: string,
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ): string | null {
    if (!token || !selected) {
      reset();
      return null;
    }
    const inserted = token.trigger + selected + " ";
    const next = text.slice(0, token.start) + inserted + text.slice(token.end);
    const caret = token.start + inserted.length;
    reset();

    requestAnimationFrame(() => {
      el?.setSelectionRange(caret, caret);
      el?.focus();
    });

    return next;
  }

  function reset() {
    requestID++;
    clearTimeout(debounceTimer);
    items = [];
    token = null;
  }

  return {
    get items() {
      return items;
    },
    get token() {
      return token;
    },
    handleInput,
    displayItem,
    select,
    reset,
  };
}
