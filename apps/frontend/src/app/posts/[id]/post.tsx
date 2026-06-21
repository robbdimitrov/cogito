import { getSafeUploadUrl } from '@/shared/utils/url';
'use client';

import {useCallback, useState} from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { useToast } from '@/shared/components/toast/toast';
import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Trash2, Repeat, Heart } from 'lucide-react';
import FormattedContent from '@/shared/components/postcontent/formattedcontent';
import GlassCard from '@/shared/components/ui/surface';
import ConfirmModal from '@/shared/components/ui/confirmmodal';
import ReplyComposer from '@/shared/components/replycomposer/replycomposer';
import QuoteComposeModal from '@/shared/components/repostmenu/quotecomposemodal';
import PostItem from '@/shared/components/postlist/postitem';

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
import type { Post, User } from '@/shared/types';

interface PostDetailProps {
  postId?: string;
  initialPost?: Post | null;
  currentUserId?: string | null;
  currentUser?: User | null;
  initialReplies?: Post[];
}

function PostDetail({ initialPost, currentUserId, currentUser, initialReplies }: PostDetailProps) {
  const apiClient = useAPI();
  const toast = useToast();
  const [postState, setPostState] = useState({source: initialPost, value: initialPost});
  const post = postState.source === initialPost ? postState.value : initialPost;
  const setPost = useCallback(
    (nextPost: Post | null | ((prev: Post | null) => Post | null)) => {
      setPostState((prevState) => {
        const currentPost = prevState.source === initialPost ? prevState.value : initialPost;
        const value = typeof nextPost === 'function' ? nextPost(currentPost) : nextPost;
        return {source: initialPost, value};
      });
    },
    [initialPost]
  );
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [replies, setReplies] = useState<Post[]>(initialReplies ?? []);
  const [quotingPost, setQuotingPost] = useState<Post | null>(null);

  const author = post?.user;

  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  const handleLike = useCallback(async () => {
    if (!post || isLiking) return;
    setIsLiking(true);
    const prevPost = post;
    setPost(prev => ({
      ...prev!,
      liked: !prev!.liked,
      likes: prev!.liked ? Math.max(0, prev!.likes - 1) : prev!.likes + 1
    }));
    try {
      if (prevPost.liked) {
        await apiClient.unlikePost(prevPost.id);
      } else {
        await apiClient.likePost(prevPost.id);
      }
      // Re-fetch in background to ensure sync
      apiClient.getPost(prevPost.id).then(updated => setPost(updated as Post)).catch(() => {});
    } catch (e: unknown) {
      toast.error('Action failed.');
      setPost(prevPost);
    } finally {
      setIsLiking(false);
    }
  }, [post, toast, isLiking, apiClient, setPost]);

  const handleRepost = useCallback(async () => {
    if (!post || isReposting) return;
    setIsReposting(true);
    const prevPost = post;
    setPost(prev => ({
      ...prev!,
      reposted: !prev!.reposted,
      reposts: prev!.reposted ? Math.max(0, prev!.reposts - 1) : prev!.reposts + 1
    }));
    try {
      if (prevPost.reposted) {
        await apiClient.removeRepost(prevPost.id);
      } else {
        await apiClient.repostPost(prevPost.id);
      }
      apiClient.getPost(prevPost.id).then(updated => setPost(updated as Post)).catch(() => {});
    } catch (e: unknown) {
      toast.error('Action failed.');
      setPost(prevPost);
    } finally {
      setIsReposting(false);
    }
  }, [post, toast, isReposting, apiClient, setPost]);

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
              <Avatar name={author.name} size="md" photoKey={author.profilePhotoKey} />
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
              {post.mediaKey && (
                <div className="mt-3 sm:mt-4">
                  <img src={getSafeUploadUrl(post.mediaKey)} alt="Post attachment" className="max-h-[500px] w-auto rounded-xl object-contain border border-slate-200 dark:border-slate-800" />
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700 sm:mt-6 sm:gap-6 sm:pt-4">
                <button
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 ${post.reposted ? 'text-success bg-success/10' : 'text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success/10'}`}
                  onClick={handleRepost}
                  disabled={isReposting}
                >
                  <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
                  {post.reposts}
                </button>
                <button
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 ${post.liked ? 'text-error bg-error/10' : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/10'}`}
                  onClick={handleLike}
                  disabled={isLiking}
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
      {currentUser && post && (
        <div className="mt-3">
          <ReplyComposer
            currentUser={currentUser}
            replyToPost={post}
            onReply={async (content) => {
              await apiClient.createPost(content, undefined, post.id);
              router.refresh();
            }}
          />
        </div>
      )}
      {replies.length > 0 && (
        <div className="mt-2 space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
          {replies.map((reply) => (
            <PostItem
              key={reply.id}
              post={reply}
              user={reply.user}
              onLike={async (p: Post) => {
                // PostItem applies the like optimistically; no refetch needed.
                try {
                  p.liked ? await apiClient.unlikePost(p.id) : await apiClient.likePost(p.id);
                } catch {
                  toast.error('Action failed.');
                }
              }}
              onRepost={async (p: Post) => {
                // PostItem applies the repost optimistically; no refetch needed.
                try {
                  p.reposted ? await apiClient.removeRepost(p.id) : await apiClient.repostPost(p.id);
                } catch {
                  toast.error('Action failed.');
                }
              }}
              onDelete={async (id: string) => {
                try {
                  await apiClient.deletePost(id);
                  setReplies((prev) => prev.filter((r) => r.id !== id));
                } catch {
                  toast.error('Delete failed.');
                }
              }}
              currentUserId={currentUserId}
              onQuote={(p: Post) => setQuotingPost(p)}
            />
          ))}
        </div>
      )}
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
    </div>
  );
}

export default PostDetail;
