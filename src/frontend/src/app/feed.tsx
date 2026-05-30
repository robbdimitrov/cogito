'use client';

import React from 'react';
import UserCard from '@/app/usercard';
import CreateThought from '@/app/createthought';
import ThoughtList from '@/shared/components/thoughtlist/thoughtlist';


import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';

function Feed(props: any) {
  const apiClient = useAPI();
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: ''};
  const posts = props.posts || [];
  const { currentUserId } = props;

  const handleLike = async (post) => {
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
      router.refresh();
    } catch {}
  };

  const handleRepost = async (post) => {
    try {
      post.reposted ? await apiClient.removeRepost(post.id) : await apiClient.repostPost(post.id);
      router.refresh();
    } catch {}
  };

  const handleDeletePost = async (postId) => {
    try {
      await apiClient.deletePost(postId);
      router.refresh();
    } catch {}
  };

  const handleCreatePost = async (content) => {
    try {
      await apiClient.createPost(content);
      router.refresh();
    } catch {}
  };

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-8">
        <aside className="hidden lg:block">
          <UserCard user={user} />
        </aside>
        <section className="space-y-4 max-w-2xl w-full mx-auto lg:mx-0">
          <CreateThought user={user} onCreatePost={handleCreatePost} />
          {posts.length === 0 ? <p className="text-center text-slate-500 mt-8">No thoughts yet. Be the first to share!</p> : <ThoughtList posts={posts} users={[user]} onLike={handleLike} onRepost={handleRepost} onDelete={handleDeletePost} currentUserId={currentUserId} />}
        </section>
      </div>
    </main>
  );
}

export default Feed;
