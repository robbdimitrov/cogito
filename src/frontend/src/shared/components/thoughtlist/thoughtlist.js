import React from 'react';

import ThoughtItem from './thoughtitem';
import './thoughtlist.scss';

function ThoughtList({posts, users, onLike, onRepost}) {
  if (!posts || posts.length === 0) {
    return <div className="thought-list empty">No posts to show.</div>;
  }

  return (
    <ul className="thought-list">
      {posts.map((post) =>
        <ThoughtItem
          key={post.id}
          post={post}
          user={post.user || users[0]}
          onLike={onLike}
          onRepost={onRepost}
        />
      )}
    </ul>
  );
}

export default ThoughtList;
