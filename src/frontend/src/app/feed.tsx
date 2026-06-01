'use client';

import React from 'react';
import UserCard from '@/app/usercard';
import CreateThought from '@/app/createthought';
import ThoughtList from '@/shared/components/thoughtlist/thoughtlist';


import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import type { User, Post } from '@/shared/types';

interface FeedProps {
  user?: User | null;
  posts?: Post[];
  currentUserId?: string | null;
  isLoading?: boolean;
}

function Feed(props: FeedProps) {
  const apiClient = useAPI();
  const router = useRouter();
  const user = props.user || null;
  const posts = props.posts || [];
  const currentUserId = props.currentUserId || null;

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

  const handleCreatePost = async (content: string) => {
    try {
      await apiClient.createPost(content);
      router.refresh();
    } catch (e: unknown) {}
  };

  return (
    <main className="container mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-8">
        <aside className="hidden lg:block">
          {user && <UserCard user={user} />}
        </aside>
        <section className="w-full max-w-2xl flex flex-col gap-3 sm:gap-4 mx-auto lg:mx-0">
          {user && (
            <div className="lg:hidden">
              <UserCard user={user} variant="compact" />
            </div>
          )}
          {user && <CreateThought user={user} onCreatePost={handleCreatePost} />}
          {posts.length === 0 ? <p className="text-center text-slate-500 mt-8">No thoughts yet. Be the first to share!</p> : <ThoughtList posts={posts} users={user ? [user] : []} onLike={handleLike} onRepost={handleRepost} onDelete={handleDeletePost} currentUserId={currentUserId} />}
        </section>
      </div>
    </main>
  );
}

export default Feed;
