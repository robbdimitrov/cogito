export function createPagination<T>(
  getInitial: () => { items: T[]; nextCursor: string | null },
  fetchPage: (
    cursor: string,
  ) => Promise<{ items: T[]; nextCursor: string | null }>,
) {
  const initial = $derived(getInitial());
  let extra = $state<T[]>([]);
  let cursor = $state<string | null>(null);
  let loading = $state(false);

  $effect(() => {
    extra = [];
    cursor = initial.nextCursor;
  });

  const items = $derived([...initial.items, ...extra]);
  const done = $derived(!cursor);

  async function more() {
    if (loading || done || !cursor) return;
    loading = true;
    const next = await fetchPage(cursor);
    extra.push(...next.items);
    cursor = next.nextCursor;
    loading = false;
  }

  return {
    get items() {
      return items;
    },
    get done() {
      return done;
    },
    get loading() {
      return loading;
    },
    more,
  };
}
