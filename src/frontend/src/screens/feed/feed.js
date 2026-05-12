import React from 'react';

import UserCard from './usercard';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import './feed.scss';

function Feed(props) {
  const user = props.user || {name: '', username: '', email: ''};
  const posts = props.posts || [];

  return (
    <div className="feed-container">
      <UserCard className="user-card" user={user} />
      <div className="content">
        <ThoughtList posts={posts} users={[user]} />
      </div>
    </div>
  );
}

export default Feed;
