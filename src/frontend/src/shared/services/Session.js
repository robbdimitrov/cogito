import { setStorage } from '../utils';

function getUserId() {
  return localStorage.getItem('userId');
}

function setUserId(value) {
  localStorage.setItem('userId', value);
}

function reset() {
  localStorage.clear();
}

export default {
  getUserId,
  setUserId,
  reset
};
