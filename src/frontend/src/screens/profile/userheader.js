import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Link from '../../shared/router/link';
import './userheader.scss';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `Joined ${date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`;
}

function UserHeader({user, currentUser, onFollow, onUnfollow}) {
  const isOwnProfile = currentUser && currentUser.id === user.id;

  function handleFollowClick() {
    if (user.followed) {
      onUnfollow(user.id);
    } else {
      onFollow(user.id);
    }
  }

  return (
    <div className='user-header container'>
      <div className='cover'></div>

      <div className='content main-content'>
        {isOwnProfile ? (
          <Link href='/settings/profile'>
            <button className='follow-button outline-button'>
              Edit Profile
            </button>
          </Link>
        ) : (
          <button
            className={user.followed ? 'follow-button active' : 'follow-button outline-button'}
            onClick={handleFollowClick}
          >
            {user.followed ? 'Following' : 'Follow'}
          </button>
        )}

        <div className='texts'>
          <span className='name bold'>{user.name}</span>
          <span className='username'>@{user.username}</span>
          <p className='bio'>{user.bio}</p>

          <div className='join-date'>
            <FontAwesomeIcon icon='calendar-alt' className='join-date-icon' />
            <span className='join-date-text'>{formatDate(user.created)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHeader;
