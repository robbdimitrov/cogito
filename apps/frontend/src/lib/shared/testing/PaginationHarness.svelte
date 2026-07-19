<script lang="ts">
  import { createPagination } from "$lib/shared/createPagination.svelte";

  interface Page {
    items: number[];
    nextCursor: string | null;
  }

  interface Props {
    initial: Page;
    fetchPage: (cursor: string) => Promise<Page>;
  }

  let { initial = $bindable(), fetchPage }: Props = $props();

  const pagination = createPagination(
    () => initial,
    (cursor) => fetchPage(cursor),
  );
</script>

<span data-testid="items">{pagination.items.join(",")}</span>
<span data-testid="done">{pagination.done}</span>
<span data-testid="loading">{pagination.loading}</span>
<button type="button" onclick={() => pagination.more()}>more</button>
