import apiClient from '../../common/APIClient';

export const FETCH_FOLLOWING = 'FETCH_FOLLOWING';
export function fetchFollowing(userId, page) {
  return (dispatch) => {
    apiClient.getFollowing(userId, page).then((response) => {
      if (!response.ok) {
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

export const FETCH_FOLLOWERS = 'FETCH_FOLLOWERS';
export function fetchFollowers(userId, page) {
  return (dispatch) => {
    apiClient.getFollowers(userId, page).then((response) => {
      if (!response.ok) {
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
