import React from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { Trash2, Repeat, Heart } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';

function formatRelativeTime(dateString) {
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

function ThoughtItem({post, user, onLike, onRepost, onDelete, currentUserId}) {
  const author = post.user || user;
  const isOwnPost = currentUserId && post.userId === currentUserId;
  const rethoughtBy = post.rethoughtByUser;

  function handleDelete() {
    if (window.confirm('Delete this post?')) {
      onDelete(post.id);
    }
  }

  return (
    <li>
      {rethoughtBy && (
        <div className="mx-auto -mb-px flex w-[calc(100%-1rem)] items-center gap-1.5 rounded-t-2xl border border-b-slate-200/70 border-white/60 bg-base-100/75 px-4 py-2 text-sm text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:border-b-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
          <Repeat className="h-4 w-4" />
          <Link href={`/@${rethoughtBy.username}`} className="font-semibold hover:underline">
            @{rethoughtBy.username}
          </Link>
          <span>rethought</span>
        </div>
      )}
      <GlassCard as="article" interactive className={`overflow-hidden ${rethoughtBy ? 'rounded-b-2xl rounded-t-none' : ''}`}>
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <Link href={`/@${author?.username}`} className="shrink-0 transition-transform duration-200 hover:scale-105">
              <Avatar name={author?.name} size="md" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                  <Link href={`/@${author?.username}`} className="font-semibold hover:underline truncate text-base-content">
                    {author?.name}
                  </Link>
                  <span className="text-sm text-slate-500 dark:text-slate-400">@{author?.username}</span>
                  <Link href={`/posts/${post.id}`} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    · {formatRelativeTime(post.created)}
                  </Link>
                </div>
                {isOwnPost && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-slate-500 dark:text-slate-400 hover:text-error p-1 h-auto hover:scale-110 active:scale-90 transition-transform duration-150 shrink-0"
                    onClick={handleDelete}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Link href={`/posts/${post.id}`} className="block group">
                <p className="mt-2.5 whitespace-pre-wrap leading-relaxed text-[0.97rem] sm:text-base group-hover:text-base-content/90">{post.content}</p>
              </Link>
              <div className="flex items-center gap-2 sm:gap-4 mt-4 pt-1">
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 hover:scale-105 active:scale-95 transition-all duration-150 ${post.reposted ? 'text-success bg-success/10' : 'text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success/10'}`}
                  onClick={() => onRepost(post)}
                  aria-label={post.reposted ? 'Remove rethought' : 'Rethink thought'}
                >
                  <Repeat className="h-4 w-4" />
                  {post.reposts}
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 hover:scale-105 active:scale-95 transition-all duration-150 ${post.liked ? 'text-error bg-error/10' : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/10'}`}
                  onClick={() => onLike(post)}
                  aria-label={post.liked ? 'Unlike thought' : 'Like thought'}
                >
                  <Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} />
                  {post.likes}
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </li>
  );
}

export default ThoughtItem;
