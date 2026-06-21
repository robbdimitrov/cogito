'use client';

import { useState } from 'react';
import UserCard from '@/app/(main)/usercard';
import CreatePost from '@/app/(main)/createpost';
import PostList from '@/shared/components/postlist/postlist';
import QuoteComposeModal from '@/shared/components/repostmenu/quotecomposemodal';

import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/shared/components/toast/toast';
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
  const toast = useToast();
  const user = props.user || null;
  const posts = props.posts || [];
  const currentUserId = props.currentUserId || null;
  const [quotingPost, setQuotingPost] = useState<Post | null>(null);

  const handleLike = async (post: Post) => {
    // PostItem applies the like optimistically; no full-feed refetch needed.
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
    } catch (e: any) { toast.error(e.message || 'Failed to update like'); }
  };

  const handleRepost = async (post: Post) => {
    // PostItem applies the repost optimistically; the new repost card appears on next load.
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

  const handleCreatePost = async (content: string, mediaKey?: string) => {
    try {
      await apiClient.createPost(content, mediaKey);
      router.refresh();
    } catch (e: any) { 
      toast.error(e.message || 'Failed to create post');
      throw e;
    }
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
          {user && <CreatePost user={user} onCreatePost={handleCreatePost} />}
          <PostList posts={posts} users={user ? [user] : []} onLike={handleLike} onRepost={handleRepost} onDelete={handleDeletePost} currentUserId={currentUserId} onQuote={(post) => setQuotingPost(post)} emptyMessage="No posts yet. Be the first to share!" />
        </section>
      </div>
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
    </main>
  );
}

export default Feed;
