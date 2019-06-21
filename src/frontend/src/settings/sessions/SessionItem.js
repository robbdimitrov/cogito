import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import * as quartzite from 'quartzite';

import { getDevice } from '../../common/utils';
import './SessionItem.scss';

function SessionItem({ session, deleteSession }) {
  const device = getDevice(session.userAgent);
  const icon = device.isDesktop ? 'desktop' : 'mobile-alt';
  const date = new Date(session.dateCreated);
  const dateString = quartzite.formatDate(date);

  return (
    <li className="session-item">
      <FontAwesomeIcon icon={icon} size="lg" className="session-device-icon" />

      <div className="session-content">
        <strong className="session-name">{device.name}</strong>
        <small className="session-date">Created {dateString}</small>
      </div>

      <button
        className="outline-button revoke-button"
        onClick={deleteSession(session.id)}
      >
        Revoke
      </button>
    </li>
  );
}

SessionItem.propTypes = {
  session: PropTypes.object.isRequired,
  deleteSession: PropTypes.func.isRequired
};

export default SessionItem;
