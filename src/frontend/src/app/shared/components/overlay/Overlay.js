import React from 'react';

import './Overlay.scss';

function Overlay(props) {
  return (
    <div className="overlay">
      {props.children}
    </div>
  );
}

export default Overlay;
