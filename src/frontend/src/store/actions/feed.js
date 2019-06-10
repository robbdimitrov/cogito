import apiClient from '../../common/APIClient';

export const REQUEST_FEED = 'REQUEST_FEED';
export function requestFeed() {
  return {
    type: REQUEST_FEED
  };
}

export const RECEIVE_FEED = 'RECEIVE_FEED';
export function receiveFeed(posts, page) {
  return {
    type: RECEIVE_FEED,
    posts,
    page
  };
}

export const INVALIDATE_FEED = 'INVALIDATE_FEED';
export function invalidateFeed() {
  return {
    type: INVALIDATE_FEED
  };
}

export const REQUEST_FEED_ERROR = 'REQUEST_FEED_ERROR';
export function requestFeedError(message) {
  return {
    type: REQUEST_FEED_ERROR,
    message
  };
}

export function fetchFeed(page) {
  return (dispatch) => {
    dispatch(requestFeed())

    apiClient.getFeed(page).then((response) => {
      if (!response.ok) {
        dispatch(requestFeedError(response.eroror.message));
        return
      }
      dispatch(receiveFeed(response.posts, page));
    });
  };
}
