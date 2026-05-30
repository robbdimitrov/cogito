'use client';

import React, {useState, useEffect, useCallback} from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { useToast } from '@/shared/components/toast/toast';
import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Trash2, Repeat, Heart } from 'lucide-react';

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${diffDay}d`;
}
import type { Post } from '@/shared/types';

interface PostDetailProps {
  postId?: string;
  initialPost?: Post | null;
  currentUserId?: string | null;
}

function PostDetail({ initialPost, currentUserId }: PostDetailProps) {
  const apiClient = useAPI();
  const toast = useToast();
  const [post, setPost] = useState(initialPost);
  const router = useRouter();

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const author = post?.user;

  const handleLike = useCallback(async () => {
    if (!post) return;
    try {
      if (post.liked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }
      const updated = await apiClient.getPost(post.id);
      setPost(updated);
    } catch (e: unknown) {
      toast.error('Action failed.');
    }
  }, [post, toast]);

  const handleRepost = useCallback(async () => {
    if (!post) return;
    try {
      if (post.reposted) {
        await apiClient.removeRepost(post.id);
      } else {
        await apiClient.repostPost(post.id);
      }
      const updated = await apiClient.getPost(post.id);
      setPost(updated);
    } catch (e: unknown) {
      toast.error('Action failed.');
    }
  }, [post, toast]);

  const handleDelete = useCallback(async () => {
    if (!post || !window.confirm('Delete this post?')) return;
    try {
      await apiClient.deletePost(post.id);
      toast.success('Post deleted.');
      router.push('/');
    } catch (e: unknown) {
      toast.error('Delete failed.');
    }
  }, [post, toast, router]);



  if (!post || !author) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body items-center text-center py-12">
            <AlertTriangle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-slate-600 dark:text-slate-300">Post not found.</p>
            <Link href="/" className="btn btn-primary btn-sm mt-4">Back to Feed</Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnPost = currentUserId && post.userId === currentUserId;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-4">
        <Link href="/" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-6">
          <div className="flex items-start gap-3">
            <Link href={`/@${author.username}`}>
              <Avatar name={author.name} size="lg" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/@${author.username}`} className="font-bold text-lg hover:underline">
                    {author.name}
                  </Link>
                  <span className="text-sm text-slate-500 dark:text-slate-400">@{author.username}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">· {formatRelativeTime(post.created)}</span>
                </div>
                {isOwnPost && (
                  <button
                    className="btn btn-ghost btn-xs text-slate-500 dark:text-slate-400 hover:text-error p-1 h-auto hover:scale-110 active:scale-90 transition-transform duration-150"
                    onClick={handleDelete}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-4 text-lg whitespace-pre-wrap leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  className={`btn btn-ghost btn-sm gap-1 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.reposted ? 'text-success' : 'text-slate-500 dark:text-slate-400 hover:text-success'}`}
                  onClick={handleRepost}
                >
                  <Repeat className="h-5 w-5" />
                  {post.reposts}
                </button>
                <button
                  className={`btn btn-ghost btn-sm gap-1 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.liked ? 'text-error' : 'text-slate-500 dark:text-slate-400 hover:text-error'}`}
                  onClick={handleLike}
                >
                  <Heart className="h-5 w-5" fill={post.liked ? 'currentColor' : 'none'} />
                  {post.likes}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostDetail;
