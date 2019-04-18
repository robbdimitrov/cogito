import React from 'react';

import UserItem from './UserItem';
import './UserList.scss';

function UserList(props) {
  return (
    <ul className='user-list'>
      {[...Array(props.items).keys()].map((item) =>
        <UserItem
          key={item.toString()}
          value={item}
        />
      )}
    </ul>
  );
}

export default UserList;
