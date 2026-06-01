'use client';

import React, {useState, useEffect, useCallback} from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { useToast } from '@/shared/components/toast/toast';
import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Trash2, Repeat, Heart } from 'lucide-react';
import FormattedContent from '@/shared/components/postcontent/formattedcontent';
import GlassCard from '@/shared/components/ui/surface';
import ConfirmModal from '@/shared/components/ui/confirmmodal';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      setPost(updated as Post);
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
      setPost(updated as Post);
    } catch (e: unknown) {
      toast.error('Action failed.');
    }
  }, [post, toast]);

  const handleDelete = useCallback(async () => {
    if (!post) return;
    try {
      await apiClient.deletePost(post.id);
      toast.success('Post deleted.');
      router.push('/');
    } catch (e: unknown) {
      toast.error('Delete failed.');
    }
    setShowDeleteModal(false);
  }, [post, toast, router, apiClient]);



  if (!post || !author) {
    return (
      <div className="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
        <GlassCard>
          <div className="card-body items-center text-center py-12">
            <AlertTriangle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-slate-600 dark:text-slate-300">Post not found.</p>
            <Link href="/" className="btn btn-primary btn-sm mt-4">Back to Feed</Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const isOwnPost = currentUserId && post.userId === currentUserId;

  return (
    <div className="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="mb-3 sm:mb-4">
        <Link href="/" className="btn btn-ghost btn-sm gap-1 rounded-full px-3">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
      <GlassCard as="article" className="overflow-hidden">
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <Link href={`/@${author.username}`} className="shrink-0">
              <Avatar name={author.name} size="md" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                  <Link href={`/@${author.username}`} className="font-semibold hover:underline truncate text-base-content">
                    {author.name}
                  </Link>
                  <span className="text-sm text-slate-500 dark:text-slate-400">@{author.username}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">· {formatRelativeTime(post.created)}</span>
                </div>
                {isOwnPost && (
                  <button
                    className="btn btn-ghost btn-xs text-slate-500 dark:text-slate-400 hover:text-error p-1 h-auto hover:scale-110 active:scale-90 transition-transform duration-150"
                    onClick={() => setShowDeleteModal(true)}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <FormattedContent content={post.content} className="mt-3 whitespace-pre-wrap break-words text-[1.02rem] leading-relaxed sm:mt-4 sm:text-lg" />
              <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700 sm:mt-6 sm:gap-6 sm:pt-4">
                <button
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 ${post.reposted ? 'text-success bg-success/10' : 'text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success/10'}`}
                  onClick={handleRepost}
                >
                  <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
                  {post.reposts}
                </button>
                <button
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 ${post.liked ? 'text-error bg-error/10' : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/10'}`}
                  onClick={handleLike}
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill={post.liked ? 'currentColor' : 'none'} />
                  {post.likes}
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

export default PostDetail;
