import HashtagFeed from '@/app/hashtags/[tag]/hashtagfeed';
import { fetchServer, getCurrentUser, hydratePostAuthors } from '@/shared/services/serverapi';

function normalizeTag(rawTag: string) {
  const tag = rawTag.replace(/^#/, '').toLowerCase();
  return /^[a-z0-9_]{1,50}$/.test(tag) ? tag : '';
}

export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(rawTag);
  let initialPosts = [];

  if (tag) {
    try {
      const data = await fetchServer(`/hashtags/${encodeURIComponent(tag)}/posts?page=0`);
      if (data && data.items) {
        initialPosts = await hydratePostAuthors(data.items);
      }
    } catch (e) {
      console.error('Hashtag posts error:', e);
    }
  }

  const currentUser = await getCurrentUser();

  return (
    <main className="container mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
      <header className="mb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Hashtag</p>
        <h1 className="mt-1 text-3xl font-bold text-base-content">#{tag || rawTag}</h1>
      </header>
      <HashtagFeed tag={tag || rawTag} posts={initialPosts} currentUserId={currentUser?.id} />
    </main>
  );
}
