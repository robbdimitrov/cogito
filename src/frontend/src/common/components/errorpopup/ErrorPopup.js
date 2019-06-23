import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './ErrorPopup.scss';

function ErrorPopup({ error, dismiss }) {
  return (
    <div className="error-popup">
      <p className="error-message">{error.message}</p>

      <button className="error-close-button" onClick={dismiss}>
        <FontAwesomeIcon icon="times" />
      </button>
    </div>
  );
}

ErrorPopup.propTypes = {
  error: PropTypes.object.isRequired,
  dismiss: PropTypes.func.isRequired
};

export default ErrorPopup;
