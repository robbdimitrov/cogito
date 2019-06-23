import apiClient from '../../common/services/APIClient';

export const FETCH_FOLLOWING_IDS = 'FETCH_FOLLOWING_IDS';
export function fetchFollowingIds(userId) {
  return (dispatch) => {
    apiClient.getFollowingIds(userId).then((response) => {
      if (response.error) {
        return;
      }
      dispatch({
        type: FETCH_FOLLOWING_IDS,
        userId,
        usersIds: response.users
      });
    });
  };
}

export const FETCH_FOLLOWING = 'FETCH_FOLLOWING';
export function fetchFollowing(userId, page) {
  return (dispatch) => {
    apiClient.getFollowing(userId, page).then((response) => {
      if (response.error) {
        return;
      }
      dispatch({
        type: FETCH_FOLLOWING,
        userId,
        users: response.users,
        page
      });
    });
  };
}

export const FETCH_FOLLOWERS_IDS = 'FETCH_FOLLOWERS_IDS';
export function fetchFollowersIds(userId) {
  return (dispatch) => {
    apiClient.getFollowersIds(userId).then((response) => {
      if (response.error) {
        return;
      }
      dispatch({
        type: FETCH_FOLLOWERS_IDS,
        userId,
        usersIds: response.users
      });
    });
  };
}

export const FETCH_FOLLOWERS = 'FETCH_FOLLOWERS';
export function fetchFollowers(userId, page) {
  return (dispatch) => {
    apiClient.getFollowers(userId, page).then((response) => {
      if (response.error) {
        return;
      }
      dispatch({
        type: FETCH_FOLLOWERS,
        userId,
        users: response.users,
        page
      });
    });
  };
}
