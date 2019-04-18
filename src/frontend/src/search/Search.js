import React from 'react';

import ScopeBar from './ScopeBar';
import SearchBar from './SearchBar';
import UserList from '../common/userlist/UserList';
import ThoughtList from '../common/thoughtlist/ThoughtList';
import './Search.scss';

class Search extends React.Component {
  render() {
    return (
      <div className='search-container'>
        <SearchBar />
        <ScopeBar />

        <div className='main-content'>
          <div className='user-container'>
            <div className='search-users-header'>
              <span className='users-header-title'>People</span>
              <span className='users-header-button'>View all</span>
            </div>

            <UserList items={2} />
          </div>

          <div className='thought-container'>
            <ThoughtList items={3} />
          </div>
        </div>
      </div>
    );
  }
}

export default Search;
