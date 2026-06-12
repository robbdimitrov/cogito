'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import PostList from '@/shared/components/postlist/postlist';
import QuoteComposeModal from '@/shared/components/repostmenu/quotecomposemodal';
import type { Post, User } from '@/shared/types';

interface PostTabProps {
  user: User;
  posts: Post[];
  currentUserId?: string | null;
  emptyMessage: string;
}

function PostTab({ user, posts, currentUserId, emptyMessage }: PostTabProps) {
  const apiClient = useAPI();
  const router = useRouter();
  const toast = useToast();
  const [quotingPost, setQuotingPost] = useState<Post | null>(null);

  const handleLike = async (post: Post) => {
    // PostItem applies the like optimistically; no full-list refetch needed.
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
    } catch (e: any) { toast.error(e.message || 'Failed to update like'); }
  };

  const handleRepost = async (post: Post) => {
    // PostItem applies the repost optimistically; no full-list refetch needed.
    try {
      post.reposted ? await apiClient.removeRepost(post.id) : await apiClient.repostPost(post.id);
    } catch (e: any) { toast.error(e.message || 'Failed to update repost'); }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      router.refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to delete post'); }
  };

  return (
    <>
      <PostList
        posts={posts}
        users={[user]}
        onLike={handleLike}
        onRepost={handleRepost}
        onDelete={handleDeletePost}
        currentUserId={currentUserId}
        onQuote={(post) => setQuotingPost(post)}
        emptyMessage={emptyMessage}
      />
      {quotingPost && (
        <QuoteComposeModal
          quotedPost={quotingPost}
          onClose={() => setQuotingPost(null)}
          onSubmit={async (content) => {
            await apiClient.createPost(content, undefined, undefined, quotingPost.id);
            setQuotingPost(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export default PostTab;
