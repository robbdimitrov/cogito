import React from 'react';

import UserCard from './UserCard';
import ThoughtList from '../common/components/thoughtlist/ThoughtList';
import { fetchFeed } from '../store/actions/feed';
import { fetchUserIfNeeded } from '../store/actions/users';
import session from '../common/services/Session';
import './Feed.scss';

class Feed extends React.Component {
  render() {
    return (
      <div className="feed-container">
        <UserCard className="user-card" user={this.props.user} />
        <div className="content">
          <ThoughtList items={3} />
        </div>
      </div>
    );
  }
}

export default Feed;
