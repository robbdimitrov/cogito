import { setStorage } from '../utils';

function getUserId() {
  return localStorage.getItem('userId');
}

function setUserId(value) {
  setStorage('userId', value);
}

function reset() {
  localStorage.clear();
}

export default {
  getUserId,
  setUserId,
  reset
};
