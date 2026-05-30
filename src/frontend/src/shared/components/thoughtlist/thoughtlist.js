import React from 'react';
import ThoughtItem from './thoughtitem';
import { MessageSquare } from 'lucide-react';

function ThoughtList({posts, users, onLike, onRepost, onDelete, currentUserId, emptyMessage = "No thoughts yet. Share what's on your mind!"}) {
  if (!posts || posts.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-base-content/60 py-12">
          <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <ThoughtItem
          key={post.id}
          post={post}
          user={users[0]}
          onLike={onLike}
          onRepost={onRepost}
          onDelete={onDelete || (() => {})}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  );
}

export default ThoughtList;
