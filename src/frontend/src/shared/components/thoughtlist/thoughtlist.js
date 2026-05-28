import React from 'react';
import ThoughtItem from './thoughtitem';

function ThoughtList({posts, users, onLike, onRepost, onDelete, currentUserId}) {
  if (!posts || posts.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-base-content/60 py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <p>No thoughts yet. Share what's on your mind!</p>
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
