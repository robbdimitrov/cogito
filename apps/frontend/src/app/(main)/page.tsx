import Feed from '@/app/feed';
import { fetchServer, hydratePostAuthors, getCurrentUser } from '@/shared/services/serverapi';
import type { Post } from '@/shared/types';

export default async function FeedPage() {
  let initialPosts: Post[] = [];
  try {
    const data = await fetchServer<{ items: Post[] }>('/posts/feed?page=0');
    if (data && data.items) {
      initialPosts = await hydratePostAuthors(data.items);
    }
  } catch (e) {
    console.error('Feed error:', e);
  }

  const user = await getCurrentUser();

  return (
    <Feed 
      posts={initialPosts} 
      isLoading={false} 
      user={user} 
      currentUserId={user?.id}
    />
  );
}
