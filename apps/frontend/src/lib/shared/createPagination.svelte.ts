export function createPagination<T>(
  initial: T[],
  fetchPage: (page: number) => Promise<T[]>,
) {
  let items = $state(initial);
  let page = $state(0);
  let loading = $state(false);
  let done = $state(initial.length === 0);

  async function more() {
    if (loading || done) return;
    loading = true;
    const next = await fetchPage(page + 1);
    page += 1;
    if (next.length) {
      items = [...items, ...next];
    } else {
      done = true;
    }
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
