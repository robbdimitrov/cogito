import React, { useState } from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { Trash2, Repeat, Heart } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';
import FormattedContent from '@/shared/components/postcontent/formattedcontent';
import ConfirmModal from '@/shared/components/ui/confirmmodal';

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

function ThoughtItem({post, user, onLike, onRepost, onDelete, currentUserId}) {
  const author = post.user || user;
  const isOwnPost = currentUserId && post.userId === currentUserId;
  const rethoughtBy = post.rethoughtByUser;
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleDelete() {
    onDelete(post.id);
    setShowDeleteModal(false);
  }

  return (
    <li>
      {rethoughtBy && (
        <div className="mx-auto -mb-px flex w-[calc(100%-1rem)] items-center gap-2 rounded-t-2xl border border-b-slate-200/70 border-white/60 bg-base-100/75 px-4 sm:px-5 py-2 text-xs sm:text-sm text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:border-b-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
          <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <Link href={`/@${rethoughtBy.username}`} className="font-semibold hover:underline truncate min-w-0">
            @{rethoughtBy.username}
          </Link>
          <span className="shrink-0">rethought</span>
        </div>
      )}
      <GlassCard as="article" interactive className={`overflow-hidden ${rethoughtBy ? 'rounded-b-2xl rounded-t-none' : ''}`}>
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <Link href={`/@${author?.username}`} className="shrink-0 transition-transform duration-200 hover:scale-105">
              <Avatar name={author?.name} size="md" />
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
                content={post.content}
                className="mt-3 sm:mt-3.5 whitespace-pre-wrap break-words text-[15px] sm:text-[1.05rem] leading-relaxed text-slate-800 dark:text-slate-200"
              />
              <div className="mt-3">
                <Link href={`/posts/${post.id}`} className="text-[0.8rem] sm:text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                  {formatPostDate(post.created)}
                </Link>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm gap-2 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.reposted ? 'text-success bg-success/10' : 'text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success/5'}`}
                  onClick={() => onRepost(post)}
                  aria-label={post.reposted ? 'Remove rethought' : 'Rethink thought'}
                >
                  <Repeat className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${post.reposted ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`} />
                  <span className="text-xs sm:text-sm font-semibold tracking-wide">{post.reposts}</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm gap-2 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.liked ? 'text-error bg-error/10' : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/5'}`}
                  onClick={() => onLike(post)}
                  aria-label={post.liked ? 'Unlike thought' : 'Like thought'}
                >
                  <Heart className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${post.liked ? 'scale-125' : 'scale-100'}`} fill={post.liked ? 'currentColor' : 'none'} />
                  <span className="text-xs sm:text-sm font-semibold tracking-wide">{post.likes}</span>
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

export default ThoughtItem;
