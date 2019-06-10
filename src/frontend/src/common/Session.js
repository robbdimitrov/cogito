import { setStorage } from './utils';

const Session = {
  getId: () => {
    return localStorage.getItem('sessionId');
  },
  setId: (value) => {
    setStorage('sessionId', value);
  },
  getToken: () => {
    return localStorage.getItem('accessToken');
  },
  setToken: (value) => {
    setStorage('accessToken', value);
  },
  getUserId: () => {
    return localStorage.getItem('userId');
  },
  setUserId: (value) => {
    setStorage('userId', value);
  },
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },
  setRefreshToken: (value) => {
    setStorage('refreshToken', value);
  },
  reset: () => {
    localStorage.clear();
  }
};

export default Session;
