import session from './Session';

export class APIClient {
  // Internal

  headers() {
    return [];
  }

  request(method, urlPath, body, otherHeaders) {

  }

  // User

  createUser(name, username, email, password) {

  }

  updateUser(updates) {

  }

  getUser(username) {

  }

  getFollowing(username, page, limit) {

  }

  getFollowers(username, page, limit) {

  }

  followUser(username) {

  }

  unfollowUser(username) {

  }

  // Post

  getFeed(page, limit) {

  }

  getPosts(username, page, limit) {

  }

  getLikes(username, page, limit) {

  }

  createPost(content) {

  }

  getPost(postId) {

  }

  deletePost(postId) {

  }

  likePost(postId) {

  }

  unlikePost(postId) {

  }

  retweetPost(postId) {

  }

  deleteRetweet(postId) {

  }

  // Session

  loginUser(username, password) {

  }

  logoutUser() {
    session.reset();
  }

  getSessions() {

  }

  deleteSession(sessionId) {

  }
}
