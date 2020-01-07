import React from 'react';
import { connect } from 'react-redux';

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

const mapStateToProps = (state) => {
  return {
    user: state.users.byId[session.getUserId()]
  };
};

export default connect(
  mapStateToProps,
  { fetchFeed, fetchUserIfNeeded }
)(Feed);
