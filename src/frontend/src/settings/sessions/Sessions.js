import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SessionItem from './SessionItem';
import { fetchSessions, deleteSession } from '../../store/actions/sessions';
import './Sessions.scss';

class Sessions extends React.Component {
  componentWillMount() {
    this.props.fetchSessions();
  }

  render() {
    return (
      <div className="sessions-container form-content">
        <h1 className="form-title">Sessions</h1>

        <ul className="sessions-list">
          {this.props.sessionsIds.map((sessionId) =>
            <SessionItem
              key={sessionId}
              session={this.props.sessions[sessionId]}
              deleteSession={this.props.deleteSession}
            />
          )}
        </ul>
      </div>
    );
  }
}

Sessions.propTypes = {
  sessions: PropTypes.array.isRequired
};

const mapStateToProps = (state) => ({
  sessions: state.sessions.byId,
  sessionsIds: state.session.allIds
});

export default connect(
  mapStateToProps,
  { fetchSessions, deleteSession }
)(Sessions);
