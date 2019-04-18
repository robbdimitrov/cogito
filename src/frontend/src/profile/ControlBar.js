import React from 'react';
import { NavLink } from 'react-router-dom';

import './ControlBar.scss';

function ControlBar(props) {
  return (
    <div className='control-bar-container bottom-shadow'>
      <div className='control-bar main-content'>
        <nav className='counters'>
          <NavLink to={props.path} exact className='counter thoughts'>
            <span className='counter-label'>Thoughts</span>
            <span className='counter-value'>140</span>
          </NavLink>

          <NavLink to={`${props.path}/following`} className='counter following'>
            <span className='counter-label'>Following</span>
            <span className='counter-value'>70</span>
          </NavLink>

          <NavLink to={`${props.path}/followers`} className='counter followers'>
            <span className='counter-label'>Followers</span>
            <span className='counter-value'>250</span>
          </NavLink>

          <NavLink to={`${props.path}/likes`} className='counter likes'>
            <span className='counter-label'>Likes</span>
            <span className='counter-value'>98</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

export default ControlBar;
