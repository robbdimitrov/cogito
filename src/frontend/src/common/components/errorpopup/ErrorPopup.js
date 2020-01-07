import React from 'react';
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

export default ErrorPopup;
