<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Hash, Search } from "@lucide/svelte";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";
  import type { User } from "$lib/domains/users/model";
  import type { Hashtag } from "$lib/domains/posts/api.server";

  let { data } = $props();

  let q = $derived(data.q);
  let searchInput = $derived(data.q);
  let quotingPost = $state<Post | null>(null);

  async function fetchSection<T>(
    type: "posts" | "users" | "hashtags",
    cursor: string,
  ): Promise<{ items: T[]; nextCursor: string | null }> {
    const params = new URLSearchParams({ q, type, cursor });
    const res = await fetch(`/search?${params}`);
    if (!res.ok) return { items: [], nextCursor: null };
    return (await res.json()) as { items: T[]; nextCursor: string | null };
  }

  const postsPagination = createPagination<Post>(
    () => data.posts,
    (cursor) => fetchSection<Post>("posts", cursor),
  );
  const usersPagination = createPagination<User>(
    () => data.users,
    (cursor) => fetchSection<User>("users", cursor),
  );
  const hashtagsPagination = createPagination<Hashtag>(
    () => data.hashtags,
    (cursor) => fetchSection<Hashtag>("hashtags", cursor),
  );

  let hasAnyResults = $derived(
    postsPagination.items.length > 0 ||
      usersPagination.items.length > 0 ||
      hashtagsPagination.items.length > 0,
  );

  function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    goto(resolve(`/search?${new URLSearchParams({ q: trimmed })}`));
  }

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>{q ? `${q} - Search` : "Search"} - Cogito</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
  <form onsubmit={handleSubmit} class="mb-6">
    <div class="flex gap-2">
      <label class="input input-bordered flex-1 rounded-2xl">
        <Search class="h-4 w-4 opacity-60" />
        <input
          type="search"
          placeholder="Search users, posts, hashtags..."
          bind:value={searchInput}
        />
      </label>
      <button type="submit" class="btn btn-primary rounded-2xl">Search</button>
    </div>
  </form>

  {#if !q}
    <GlassCard>
      <div
        class="card-body items-center py-12 text-center text-slate-600 dark:text-slate-300"
      >
        <Search class="mb-2 h-12 w-12 opacity-50" />
        <p>Enter a search query to find posts, people, and hashtags.</p>
      </div>
    </GlassCard>
  {:else if !hasAnyResults}
    <GlassCard>
      <div
        class="card-body items-center py-12 text-center text-slate-600 dark:text-slate-300"
      >
        <Search class="mb-2 h-12 w-12 opacity-50" />
        <p>No results found for "{q}".</p>
      </div>
    </GlassCard>
  {:else}
    <div class="space-y-8">
      {#if usersPagination.items.length > 0}
        <section class="space-y-3">
          <h2
            class="px-1 text-sm font-bold uppercase tracking-wide text-slate-500"
          >
            Users
          </h2>
          <div class="space-y-2">
            {#each usersPagination.items as user (user.id)}
              <a
                href={resolve(`/@${user.username}`)}
                class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 transition-colors hover:bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
              >
                <Avatar
                  name={user.name}
                  size="md"
                  photoKey={user.profilePhotoKey}
                />
                <span class="min-w-0">
                  <span
                    class="block truncate font-semibold text-slate-900 dark:text-white"
                  >
                    {user.name}
                  </span>
                  <span class="block truncate text-sm text-slate-500"
                    >@{user.username}</span
                  >
                </span>
              </a>
            {/each}
          </div>
          {#if !usersPagination.done}
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-full"
              disabled={usersPagination.loading}
              onclick={() => usersPagination.more()}
            >
              {usersPagination.loading ? "Loading..." : "Load more users"}
            </button>
          {/if}
        </section>
      {/if}

      {#if postsPagination.items.length > 0}
        <section class="space-y-3">
          <h2
            class="px-1 text-sm font-bold uppercase tracking-wide text-slate-500"
          >
            Posts
          </h2>
          <PostList
            posts={postsPagination.items}
            users={[]}
            currentUserId={data.currentUser?.id}
            onQuote={handleQuote}
          />
          {#if !postsPagination.done}
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-full"
              disabled={postsPagination.loading}
              onclick={() => postsPagination.more()}
            >
              {postsPagination.loading ? "Loading..." : "Load more posts"}
            </button>
          {/if}
        </section>
      {/if}

      {#if hashtagsPagination.items.length > 0}
        <section class="space-y-3">
          <h2
            class="px-1 text-sm font-bold uppercase tracking-wide text-slate-500"
          >
            Hashtags
          </h2>
          <div class="space-y-2">
            {#each hashtagsPagination.items as hashtag (hashtag.id)}
              <a
                href={resolve(`/hashtags/${hashtag.name}`)}
                class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 transition-colors hover:bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
                  >
                    <Hash class="h-5 w-5" />
                  </span>
                  <span class="truncate font-semibold text-primary"
                    >#{hashtag.name}</span
                  >
                </span>
                <span class="shrink-0 text-sm text-slate-500">
                  {hashtag.postCount}
                  {hashtag.postCount === 1 ? "post" : "posts"}
                </span>
              </a>
            {/each}
          </div>
          {#if !hashtagsPagination.done}
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-full"
              disabled={hashtagsPagination.loading}
              onclick={() => hashtagsPagination.more()}
            >
              {hashtagsPagination.loading ? "Loading..." : "Load more hashtags"}
            </button>
          {/if}
        </section>
      {/if}
    </div>
  {/if}

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
