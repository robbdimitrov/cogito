import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SessionItem from './SessionItem';
import { deleteSession } from '../../store/actions/sessions';
import './Sessions.scss';

class Sessions extends React.Component {
  render() {
    const { sessions, sessionsIds } = this.props;

    return (
      <div className="sessions-container form-content">
        <h1 className="form-title">Sessions</h1>

        <ul className="sessions-list">
          {sessionsIds.map((sessionId) =>
            <SessionItem
              key={sessionId}
              session={sessions[sessionId]}
              deleteSession={() => deleteSession(sessionId)}
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
  { deleteSession }
)(Sessions);
