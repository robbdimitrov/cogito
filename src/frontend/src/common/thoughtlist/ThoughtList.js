import React from 'react';

import ThoughtItem from './ThoughtItem';

import './ThoughtList.scss';

function ThoughtList(props) {
  return (
    <ul className='thought-list'>
      {[...Array(props.items).keys()].map((item) =>
        <ThoughtItem
          key={item.toString()}
          value={item}
        />
      )}
    </ul>
  );
}

export default ThoughtList;
