import PostDetail from '@/app/posts/[id]/post';
import { fetchServer, getCurrentUser } from '@/shared/services/serverapi';
import type { Post } from '@/shared/types';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let post: Post | null = null;
  try {
    const data = await fetchServer<Post>(`/posts/${id}`);
    if (data) {
      post = data;
    }
  } catch (e) {
    console.error('Post error:', e);
  }

  let replies: Post[] = [];
  try {
    const repliesData = await fetchServer<{ items: Post[] }>(`/posts/${id}/replies?page=0&limit=20`);
    if (repliesData?.items) {
      replies = repliesData.items;
    }
  } catch {}

  const currentUser = await getCurrentUser();

  return <PostDetail postId={id} initialPost={post} currentUserId={currentUser?.id} currentUser={currentUser} initialReplies={replies} />;
}
