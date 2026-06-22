<script lang="ts">
  import { goto } from "$app/navigation";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import type { Post } from "$lib/domains/posts/model";

  let { data } = $props();

  let q = $derived(data.q);
  let tab = $derived(data.tab);
  let searchInput = $state(data.q);

  let quotingPost = $state<Post | null>(null);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const params = new URLSearchParams({ q: searchInput, tab });
    goto(`/search?${params}`);
  }

  function switchTab(newTab: string) {
    const params = new URLSearchParams({ q, tab: newTab });
    goto(`/search?${params}`);
  }

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>{q ? `${q} - Search` : "Search"} - Thoughts</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
  <form onsubmit={handleSubmit} class="mb-6">
    <div class="flex gap-2">
      <input
        type="search"
        class="input input-bordered flex-1 rounded-2xl"
        placeholder="Search..."
        bind:value={searchInput}
      />
      <button type="submit" class="btn btn-primary rounded-2xl">Search</button>
    </div>
  </form>

  <div class="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
    {#each ["posts", "users", "hashtags"] as t}
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors {tab === t
          ? 'border-b-2 border-primary text-primary'
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}"
        onclick={() => switchTab(t)}
      >
        {t.charAt(0).toUpperCase() + t.slice(1)}
      </button>
    {/each}
  </div>

  {#if tab === "posts"}
    {#if data.posts.length > 0}
      <PostList
        posts={data.posts}
        users={[]}
        currentUserId={data.currentUser?.id}
        onQuote={handleQuote}
        emptyMessage="No posts found."
      />
    {:else if q.startsWith("#")}
      <p class="text-slate-500 dark:text-slate-400">No posts with {q} yet.</p>
    {:else}
      <p class="text-slate-500 dark:text-slate-400">Search with a hashtag like #golang to find posts.</p>
    {/if}
  {:else if tab === "users"}
    {#if data.users.length > 0}
      <div class="space-y-2">
        {#each data.users as user}
          <a
            href={`/@${user.username}`}
            class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 transition-colors hover:bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
          >
            <div>
              <div class="font-semibold text-slate-900 dark:text-white">{user.name}</div>
              <div class="text-sm text-slate-500">@{user.username}</div>
            </div>
          </a>
        {/each}
      </div>
    {:else if q}
      <p class="text-slate-500 dark:text-slate-400">No users found.</p>
    {/if}
  {:else if tab === "hashtags"}
    {#if data.hashtags.length > 0}
      <div class="space-y-2">
        {#each data.hashtags as hashtag}
          <a
            href={`/search?q=%23${hashtag.name}&tab=posts`}
            class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/60 p-4 transition-colors hover:bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
          >
            <span class="font-semibold text-primary">#{hashtag.name}</span>
            <span class="text-sm text-slate-500">{hashtag.postCount} {hashtag.postCount === 1 ? 'post' : 'posts'}</span>
          </a>
        {/each}
      </div>
    {:else if q}
      <p class="text-slate-500 dark:text-slate-400">No hashtags found.</p>
    {/if}
  {/if}

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
