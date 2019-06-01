import {
  FOLLOW_USER, UNFOLLOW_USER
} from '../constants';

export function followUser(userId) {
  return {
    type: types,
    userId
  }
}
