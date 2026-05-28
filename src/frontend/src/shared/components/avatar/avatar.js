import React from 'react';

function Avatar({name, size = 'md'}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-content font-bold flex items-center justify-center select-none leading-none`}
      aria-label={`${name || 'User'} avatar`}
    >
      {initial}
    </div>
  );
}

export default Avatar;
