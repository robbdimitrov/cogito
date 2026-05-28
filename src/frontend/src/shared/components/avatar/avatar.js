import React from 'react';

function Avatar({name, size = 'md'}) {
  const sizeMap = {
    sm: 'w-8 text-xs',
    md: 'w-10 text-sm',
    lg: 'w-14 text-xl',
    xl: 'w-20 text-2xl',
  };

  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div className="avatar placeholder">
      <div className={`bg-primary text-primary-content rounded-full ${sizeMap[size]} flex items-center justify-center font-bold`}>
        <span>{initial}</span>
      </div>
    </div>
  );
}

export default Avatar;
