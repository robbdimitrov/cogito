'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '@/shared/contexts/apicontext';
import ThoughtList from '@/shared/components/thoughtlist/thoughtlist';
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

  const handleLike = async (post: Post) => {
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleRepost = async (post: Post) => {
    try {
      post.reposted ? await apiClient.removeRepost(post.id) : await apiClient.repostPost(post.id);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      router.refresh();
    } catch (e: unknown) {}
  };

  return (
    <ThoughtList
      posts={posts}
      users={[user]}
      onLike={handleLike}
      onRepost={handleRepost}
      onDelete={handleDeletePost}
      currentUserId={currentUserId}
      emptyMessage={emptyMessage}
    />
  );
}

export default PostTab;
