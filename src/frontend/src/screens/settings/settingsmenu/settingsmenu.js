import React from 'react';
import SettingsMenuItem from './settingsmenuitem';

const menuItems = [
  {title: 'Edit profile', link: 'profile'},
  {title: 'Change password', link: 'password'},
];

function SettingsMenu() {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-0">
        <div className="px-4 py-3 border-b border-base-200 font-semibold">Settings</div>
        <ul className="menu menu-sm">
          {menuItems.map((item) => (
            <SettingsMenuItem key={item.link} link={item.link} title={item.title} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SettingsMenu;
