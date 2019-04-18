import React from 'react';

import ThoughtItem from './ThoughtItem';

import './ThoughtList.scss';

function ThoughtList(props) {
  const listItems = [...Array(props.items).keys()].map((number) =>
    <ThoughtItem
      key={number.toString()}
      value={number}
    />
  );
  return (
    <ul className='thought-list'>
      {listItems}
    </ul>
  );
}

export default ThoughtList;
