import React from 'react';

import SettingsMenuItem from './SettingsMenuItem';
import SettingsMenuHeader from './SettingsMenuHeader';
import './SettingsMenu.scss';

const menuItems = [
  {title: 'Edit profile', link: 'account'},
  {title: 'Change password', link: 'password'},
  {title: 'Sessions', link: 'sessions'}
];

function SettingsMenu(props) {
  return (
    <div className='settings-menu'>
      <ul className='settings-menu-list'>
        <SettingsMenuHeader title='Settings' />

        {menuItems.map((item) =>
          <SettingsMenuItem
            key={item.link}
            link={item.link}
            title={item.title}
          />
        )}
      </ul>
    </div>
  );
}

export default SettingsMenu;
