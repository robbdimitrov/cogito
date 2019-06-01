import {
  FOLLOW_USER, UNFOLLOW_USER
} from '../constants';

export function followUser(userId) {
  return {
    type: FOLLOW_USER,
    userId
  }
}

export function unfollowUser(userId) {
  return {
    type: UNFOLLOW_USER,
    userId
  }
}
