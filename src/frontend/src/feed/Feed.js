import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import UserCard from './UserCard';
import ThoughtList from '../common/thoughtlist/ThoughtList';
import { fetchFeed } from '../store/actions/feed';
import { fetchUserIfNeeded } from '../store/actions/users';
import session from '../common/Session';
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

Feed.propTypes = {
  user: PropTypes.object.isRequired,
  fetchFeed: PropTypes.func.isRequired,
  fetchUserIfNeeded: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
  return {
    user: state.users.byId[session.getUserId()]
  };
};

export default connect(
  mapStateToProps,
  { fetchFeed, fetchUserIfNeeded }
)(Feed);
