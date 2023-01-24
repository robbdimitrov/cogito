import React from 'react';

import SettingsMenuItem from './settingsmenuitem';
import SettingsMenuHeader from './settingsmenuheader';
import './settingsmenu.scss';

const menuItems = [
  {title: 'Edit profile', link: 'profile'},
  {title: 'Change password', link: 'password'},
];

function SettingsMenu() {
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
