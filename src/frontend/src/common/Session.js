import { setStorage } from './utils';

class Session {
  getId() {
    return localStorage.getItem('sessionId');
  }

  setId(value) {
    setStorage('sessionId', value);
  }

  getToken() {
    return localStorage.getItem('accessToken');
  }

  setToken(value) {
    setStorage('accessToken', value);
  }

  getUserId() {
    return localStorage.getItem('userId');
  }

  setUserId(value) {
    setStorage('userId', value);
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  setRefreshToken(value) {
    setStorage('refreshToken', value);
  }

  reset() {
    localStorage.clear();
  }
};

const session = new Session();

export default session;
