import {
  CREATE_POST, LIKE_POST, RETWEET_POST, DELETE_POST
} from '../constants';

export function likePost(postId) {
  return {
    type: LIKE_POST,
    postId
  };
}

export function retweetPost(postId) {
  return {
    type: RETWEET_POST,
    postId
  };
}

export function deletePost(postId) {
  return {
    type: DELETE_POST,
    postId
  };
}

export function createPost() {

}
