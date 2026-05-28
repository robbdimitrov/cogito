import React from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';

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
    <li className="card bg-base-100 border border-base-200 hover:border-base-300 transition-colors duration-150 cursor-default">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <Avatar name={author?.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/@${author?.username}`} className="font-semibold hover:underline truncate">
                  {author?.name}
                </Link>
                <span className="text-sm text-base-content/50">@{author?.username}</span>
                <Link href={`/posts/${post.id}`} className="text-sm text-base-content/30 hover:text-base-content/60 transition-colors">
                  · {formatRelativeTime(post.created)}
                </Link>
              </div>
              {isOwnPost && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-base-content/30 hover:text-error p-1 h-auto"
                  onClick={handleDelete}
                  aria-label="Delete post"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            <div className="flex gap-6 mt-3">
              <button
                type="button"
                className={`btn btn-ghost btn-xs gap-1 rounded-full px-3 ${post.reposted ? 'text-success' : 'text-base-content/40 hover:text-success'}`}
                onClick={() => onRepost(post)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {post.reposts}
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs gap-1 rounded-full px-3 ${post.liked ? 'text-error' : 'text-base-content/40 hover:text-error'}`}
                onClick={() => onLike(post)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
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
