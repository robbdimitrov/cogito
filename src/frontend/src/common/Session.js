import { setStorage } from './utils';

const Session = {
  id: () => {
    return localStorage.getItem('sessionId');
  },
  setId: (value) => {
    setStorage('sessionId', value);
  },
  token: () => {
    return localStorage.getItem('accessToken');
  },
  setToken: (value) => {
    setStorage('accessToken', value);
  },
  userId: () => {
    return localStorage.getItem('userId');
  },
  setUserId: (value) => {
    setStorage('userId', value);
  },
  refreshToken: () => {
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
