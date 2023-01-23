import React from 'react';

import UserCard from './UserCard';
import ThoughtList from '../../shared/components/thoughtlist/ThoughtList';
import './Feed.scss';

function Feed({user}) {
  return (
    <div className="feed-container">
      <UserCard className="user-card" user={user} />
      <div className="content">
        <ThoughtList items={3} />
      </div>
    </div>
  );
}

export default Feed;
