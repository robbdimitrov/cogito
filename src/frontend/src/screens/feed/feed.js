import React from 'react';

import UserCard from './usercard';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import './feed.scss';

function Feed() {
  const user = {name: 'John', username: 'john', email: 'email@mail.com'};

  return (
    <div className="feed-container">
      <UserCard className="user-card" user={user} />
      <div className="content">
        <ThoughtList posts={[]} />
      </div>
    </div>
  );
}

export default Feed;
