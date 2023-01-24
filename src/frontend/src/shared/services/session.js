const Session = {
  getUserId() {
    return localStorage.getItem('userId');
  },

  setUserId(value) {
    localStorage.setItem('userId', value);
  },

  reset() {
    localStorage.clear();
  }
};

export default Session;
