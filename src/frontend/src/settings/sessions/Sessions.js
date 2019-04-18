import React from 'react';

import SessionItem from './SessionItem';
import './Sessions.scss';

const sessions = [
  {name: 'Macintosh', isDesktop: true, isCurrent: true, id: 1},
  {name: 'Android', isDesktop: false, isCurrent: false, id: 2},
  {name: 'iPhone', isDesktop: false, isCurrent: false, id: 3},
  {name: 'Android', isDesktop: false, isCurrent: false, id: 4},
];

class Sessions extends React.Component {
  render() {
    return (
      <div className='sessions-container form-content'>
        <h1 className='form-title'>Sessions</h1>

        <ul className='sessions-list'>
          {sessions.map((item) =>
            <SessionItem
              key={item.id}
              name={item.name}
              isDesktop={item.isDesktop}
              isCurrent={item.isCurrent}
            />
          )}
        </ul>
      </div>
    );
  }
}

export default Sessions;
