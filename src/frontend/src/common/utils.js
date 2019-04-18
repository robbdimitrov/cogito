/**
 * Goes through the userAgent and matches the OS to one of the existing.
 */
export function getDeviceName() {
  let name = 'Unknown';
  let userAgent = navigator.userAgent;

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
