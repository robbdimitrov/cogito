import React from 'react';
import { connect } from 'react-redux';

import SessionItem from './SessionItem';
import { fetchSessions, deleteSession } from '../../store/actions/sessions';
import './Sessions.scss';

class Sessions extends React.Component {
  componentDidMount() {
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

const mapStateToProps = (state) => {
  return {
    sessions: state.sessions.byId,
    sessionsIds: state.session.allIds
  };
};

export default connect(
  mapStateToProps,
  { fetchSessions, deleteSession }
)(Sessions);
