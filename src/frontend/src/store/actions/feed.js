import apiClient from '../../common/services/APIClient';
import { handleError } from './errors';

export const FETCH_FEED = 'FETCH_FEED';
export function fetchFeed(page) {
  return (dispatch) => {
    apiClient.getFeed(page).then((response) => {
      if (response.error) {
        dispatch(handleError(response.error));
        return;
      }

      dispatch({
        type: FETCH_FEED,
        posts: response.posts,
        page
      });
    });
  };
}
