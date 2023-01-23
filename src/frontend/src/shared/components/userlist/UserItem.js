import React from 'react';
import {Link} from 'react-router-dom';

import './UserItem.scss';

function UserItem({user}) {
  return (
    <li className="user-item container user-card">
      <div className="cover"></div>

      <div className="content">
        <div className="header">
          <button className="follow-button outline-button">
            Follow
          </button>
        </div>

        <div className="texts">
          <Link to={`/${user.username}`}>
            <p className="title semibold">{user.name}</p>
            <p className="subtitle light">@{user.username}</p>
          </Link>

          <p className="bio">
            {user.bio}
          </p>
        </div>
      </div>
    </li>
  );
}

export default UserItem;
