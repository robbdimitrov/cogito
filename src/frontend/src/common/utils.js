/**
 * Goes through the userAgent and matches the OS to one of the existing.
 */
export function getDeviceName(userAgent) {
  let name = 'Unknown';

  if (userAgent.indexOf('Windows') !== -1) {
    name = 'Windows';
  } else if (userAgent.indexOf('Macintosh') !== -1) {
    name = 'Macintosh';
  } else if (userAgent.indexOf('like Mac') !== -1) {
    if (userAgent.indexOf('iPad') !== -1) {
      name = 'iPad';
    } else {
      name ='iPhone';
    }
  } else if (userAgent.indexOf('Linux') !== -1) {
    if (userAgent.indexOf('Android') !== -1) {
      name = 'Android';
    } else {
      name = 'Linux';
    }
  }

  return name;
}

/**
 * Sets value with key in local storage. If value is missing,
 * the item is removed from localStorage
 */
export function setStorage(key, value) {
  if (value !== undefined) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}
