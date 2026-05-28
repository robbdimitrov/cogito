const Session = {
  getUserId() {
    return localStorage.getItem('userId');
  },

  setUserId(value) {
    localStorage.setItem('userId', value);
  },

  reset() {
    localStorage.removeItem('userId');
  }
};

export default Session;
