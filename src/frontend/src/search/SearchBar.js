import React from 'react';

import './SearchBar.scss';

class SearchBar extends React.Component {
  render() {
    return (
      <div className='search-bar'>
        <div className='content main-container'>
          <input
            className='search-input'
            type='text'
            placeholder='Start typing...'
          />
        </div>
      </div>
    );
  }
}

export default SearchBar;
