import PostDetail from '@/app/posts/[id]/post';
import { fetchServer, hydratePostAuthors, getCurrentUser } from '@/shared/services/serverapi';
import type { Post } from '@/shared/types';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let post = null;
  try {
    const data = await fetchServer(`/posts/${id}`);
    if (data) {
      const hydrated = await hydratePostAuthors([data]);
      post = hydrated[0];
    }
  } catch (e) {
    console.error('Post error:', e);
  }

  let replies: Post[] = [];
  try {
    const repliesData = await fetchServer(`/posts/${id}/replies?page=0&limit=20`);
    if (repliesData?.items) {
      replies = await hydratePostAuthors(repliesData.items);
    }
  } catch {}

  const currentUser = await getCurrentUser();

  return <PostDetail postId={id} initialPost={post} currentUserId={currentUser?.id} currentUser={currentUser} initialReplies={replies} />;
}
