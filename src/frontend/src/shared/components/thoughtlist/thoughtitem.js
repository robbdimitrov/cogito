import React from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';
import { Trash2, Repeat, Heart } from 'lucide-react';

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
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

  function handleDelete() {
    if (window.confirm('Delete this post?')) {
      onDelete(post.id);
    }
  }

  return (
    <li className="card glass-card rounded-2xl animate-slide-in">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <Avatar name={author?.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/@${author?.username}`} className="font-semibold hover:underline truncate">
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
                  className="btn btn-ghost btn-xs text-slate-500 dark:text-slate-400 hover:text-error p-1 h-auto hover:scale-110 active:scale-90 transition-transform duration-150"
                  onClick={handleDelete}
                  aria-label="Delete post"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            <div className="flex gap-6 mt-3">
              <button
                type="button"
                className={`btn btn-ghost btn-xs gap-1 rounded-full px-3 hover:scale-105 active:scale-95 transition-all duration-150 ${post.reposted ? 'text-success' : 'text-slate-500 dark:text-slate-400 hover:text-success'}`}
                onClick={() => onRepost(post)}
              >
                <Repeat className="h-4 w-4" />
                {post.reposts}
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs gap-1 rounded-full px-3 hover:scale-105 active:scale-95 transition-all duration-150 ${post.liked ? 'text-error' : 'text-slate-500 dark:text-slate-400 hover:text-error'}`}
                onClick={() => onLike(post)}
              >
                <Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} />
                {post.likes}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default ThoughtItem;
