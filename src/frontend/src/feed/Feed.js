import React from 'react';

import UserCard from './UserCard';
import ThoughtList from '../common/thoughtlist/ThoughtList';
import './Feed.scss';

class Feed extends React.Component {
  render() {
    return (
      <div className='feed-container'>
        <UserCard className='user-card' />
        <div className='content'>
          <ThoughtList items={3} />
        </div>
      </div>
    );
  }
}

export default Feed;
