import React from 'react';

import UserItem from './UserItem';
import './UserList.scss';

function UserList(props) {
  const listItems = [...Array(props.items).keys()].map((number) =>
    <UserItem
      key={number.toString()}
      value={number}
    />
  );
  return (
    <ul className='user-list'>
      {listItems}
    </ul>
  );
}

export default UserList;
