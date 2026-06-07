
function Avatar({name, size = 'md', photoKey}: {name: string, size?: 'sm' | 'md' | 'lg' | 'xl', photoKey?: string}) {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div className={`avatar ${!photoKey ? 'placeholder' : ''}`}>
      <div className={`${photoKey ? 'bg-base-200' : 'bg-primary text-primary-content'} rounded-full ${sizeMap[size]} flex items-center justify-center font-bold overflow-hidden`}>
        {photoKey ? (
          <img src={`/api/uploads/${photoKey}`} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
    </div>
  );
}

export default Avatar;
