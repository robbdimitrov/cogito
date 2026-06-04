'use client';

import { useRouter } from 'next/navigation';
import ThoughtList from '@/shared/components/thoughtlist/thoughtlist';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import type { Post } from '@/shared/types';

interface HashtagFeedProps {
  tag: string;
  posts: Post[];
  currentUserId?: string | null;
}

function HashtagFeed({ tag, posts, currentUserId = null }: HashtagFeedProps) {
  const apiClient = useAPI();
  const router = useRouter();
  const toast = useToast();

  const handleLike = async (post: Post) => {
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
      router.refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to update like'); }
  };

  const handleRepost = async (post: Post) => {
    try {
      post.reposted ? await apiClient.removeRepost(post.id) : await apiClient.repostPost(post.id);
      router.refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to update repost'); }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      router.refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to delete post'); }
  };

  return (
    <ThoughtList
      posts={posts}
      users={[]}
      onLike={handleLike}
      onRepost={handleRepost}
      onDelete={handleDeletePost}
      currentUserId={currentUserId}
      emptyMessage={`No posts found for #${tag}.`}
    />
  );
}

export default HashtagFeed;
