import React from 'react';

import UserCard from './usercard';
import CreateThought from './createthought';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import Loading from '../../shared/components/loading/loading';
import './feed.scss';

function Feed(props) {
  const user = props.user || {name: '', username: '', email: ''};
  const posts = props.posts || [];
  const { isLoading, onLike, onRepost, onCreatePost } = props;

  return (
    <div className="feed-container">
      <UserCard className="user-card" user={user} />
      <div className="content">
        <CreateThought user={user} onCreatePost={onCreatePost} />
        {isLoading ? (
          <Loading />
        ) : (
          <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} />
        )}
      </div>
    </div>
  );
}

export default Feed;
