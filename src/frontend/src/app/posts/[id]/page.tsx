import PostDetail from '@/app/posts/[id]/post';
import { fetchServer, hydratePostAuthors, getCurrentUser } from '@/shared/services/serverapi';

export default async function PostPage({ params }: any) {
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

  const currentUser = await getCurrentUser();

  return <PostDetail postId={id} initialPost={post} currentUserId={currentUser?.id} />;
}
