import React from 'react';

import './ScopeBar.scss';

class ScopeBar extends React.Component {
  render() {
    return (
      <div className='scope-nav-bar'>
        <div className='content main-container'>
          <div className='scope-nav-item active'>
            <span className='scope-nav-item-title'>
              All
            </span>
          </div>

          <div className='scope-nav-item'>
            <span className='scope-nav-item-title'>
              People
            </span>
          </div>

          <div className='scope-nav-item'>
            <span className='scope-nav-item-title'>
              Tweets
            </span>
          </div>
        </div>
      </div>
    );
  }
}

export default ScopeBar;
