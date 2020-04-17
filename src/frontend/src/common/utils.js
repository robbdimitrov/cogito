/**
 * Sets value with key in local storage. If value is missing,
 * the item is removed from localStorage.
 */
export function setStorage(key, value) {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Creates an image url path using filename and api root path.
 */
export function imageURI(filename) {
  return `/images/${filename}`;
}
