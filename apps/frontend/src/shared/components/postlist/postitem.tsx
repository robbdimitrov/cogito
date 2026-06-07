import { useState } from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { Trash2, Repeat, Heart, MessageSquare } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';
import FormattedContent from '@/shared/components/postcontent/formattedcontent';
import ConfirmModal from '@/shared/components/ui/confirmmodal';
import RepostMenu from '@/shared/components/repostmenu/repostmenu';
import QuoteEmbed from './quoteembed';

function formatPostDate(dateString) {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const day = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
  });
  return `${time} · ${day}`;
}

function PostItem({post, user, onLike, onRepost, onDelete, currentUserId, onQuote}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [optimisticState, setOptimisticState] = useState({source: post, value: post});
  const optimisticPost = optimisticState.source === post ? optimisticState.value : post;

  const isRepost = !!post.repostOfId;
  const displayPost = (isRepost && post.repostOf) ? post.repostOf : optimisticPost;
  const repostedBy = isRepost ? post.user : undefined;

  const author = displayPost.user || user;
  const isOwnPost = currentUserId && post.userId === currentUserId;

  function handleDelete() {
    onDelete(post.id);
    setShowDeleteModal(false);
  }

  async function handleLike() {
    if (isLiking) return;
    setIsLiking(true);
    setOptimisticState({
      source: post,
      value: {
        ...optimisticPost,
        liked: !optimisticPost.liked,
        likes: optimisticPost.liked ? Math.max(0, optimisticPost.likes - 1) : optimisticPost.likes + 1
      }
    });
    try {
      await onLike(displayPost);
    } catch (e) {
      setOptimisticState({source: post, value: post});
    } finally {
      setIsLiking(false);
    }
  }

  async function handleRepost() {
    if (isReposting) return;
    setIsReposting(true);
    setOptimisticState({
      source: post,
      value: {
        ...optimisticPost,
        reposted: !optimisticPost.reposted,
        reposts: optimisticPost.reposted ? Math.max(0, optimisticPost.reposts - 1) : optimisticPost.reposts + 1
      }
    });
    try {
      await onRepost(displayPost);
    } catch (e) {
      setOptimisticState({source: post, value: post});
    } finally {
      setIsReposting(false);
    }
  }

  return (
    <li>
      {repostedBy && (
        <div className="mx-auto -mb-px flex w-[calc(100%-1rem)] items-center gap-2 rounded-t-2xl border border-b-slate-200/70 border-white/60 bg-base-100/75 px-4 sm:px-5 py-2 text-xs sm:text-sm text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:border-b-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
          <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <Link href={`/@${repostedBy.username}`} className="font-semibold hover:underline truncate min-w-0">
            @{repostedBy.username}
          </Link>
          <span className="shrink-0">reposted</span>
        </div>
      )}
      <GlassCard as="article" interactive className={`overflow-hidden ${repostedBy ? 'rounded-b-2xl rounded-t-none' : ''}`}>
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <Link href={`/@${author?.username}`} className="shrink-0 transition-transform duration-200 hover:scale-105">
              <Avatar name={author?.name} size="md" photoKey={author?.profilePhotoKey} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex flex-col min-w-0">
                  <Link href={`/@${author?.username}`} className="font-bold hover:underline truncate max-w-full text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-0.5 sm:mb-1">
                    {author?.name}
                  </Link>
                  <Link href={`/@${author?.username}`} className="text-[0.9rem] sm:text-sm text-slate-500 dark:text-slate-400 truncate max-w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    @{author?.username}
                  </Link>
                </div>
                {isOwnPost && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square text-slate-400 dark:text-slate-500 hover:text-error hover:bg-error/10 hover:scale-110 active:scale-90 transition-transform duration-150 shrink-0"
                    onClick={() => setShowDeleteModal(true)}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <FormattedContent
                content={displayPost.content}
                className="mt-3 sm:mt-3.5 whitespace-pre-wrap break-words text-[15px] sm:text-[1.05rem] leading-relaxed text-slate-800 dark:text-slate-200"
              />
              {displayPost.mediaKey && (
                <div className="mt-3">
                  <img src={`/api/uploads/${displayPost.mediaKey}`} alt="Post attachment" className="max-h-96 w-auto rounded-xl object-contain border border-slate-200 dark:border-slate-800" />
                </div>
              )}
              {displayPost.quotePost && (
                <QuoteEmbed post={displayPost.quotePost} />
              )}
              <div className="mt-3">
                <Link href={`/posts/${displayPost.id}`} className="text-[0.8rem] sm:text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                  {formatPostDate(displayPost.created)}
                </Link>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 sm:gap-3">
                <Link
                  href={`/posts/${displayPost.id}`}
                  className="btn btn-ghost btn-sm gap-1.5 rounded-full px-3 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                  aria-label="Replies"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-semibold">{optimisticPost.replies ?? 0}</span>
                </Link>
                <RepostMenu
                  reposted={optimisticPost.reposted ?? false}
                  reposts={optimisticPost.reposts}
                  isReposting={isReposting}
                  onRepost={handleRepost}
                  onQuote={() => onQuote?.(displayPost)}
                />
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm gap-2 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${optimisticPost.liked ? 'text-error bg-error/10' : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/5'}`}
                  onClick={handleLike}
                  disabled={isLiking}
                  aria-label={optimisticPost.liked ? 'Unlike post' : 'Like post'}
                >
                  <Heart className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${optimisticPost.liked ? 'scale-125' : 'scale-100'}`} fill={optimisticPost.liked ? 'currentColor' : 'none'} />
                  <span className="text-xs sm:text-sm font-semibold tracking-wide">{optimisticPost.likes}</span>
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
    </li>
  );
}

export default PostItem;
