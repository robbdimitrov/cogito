import {
  FETCH_FOLLOWING, FETCH_FOLLOWING_IDS,
  FETCH_FOLLOWERS, FETCH_FOLLOWERS_IDS
} from '../actions/follow';

function addFollowingIds(state, action) {

}

function addFollowingUsers(state, action) {

}

function following(state, action) {
  switch (action.type) {
    case FETCH_FOLLOWING:
      return {
        ...state,
        userFollowing: {
          ...state.userFollowing,
          [action.userId]: {
            items: [
              ...state.userFollowing[action.userId],
              ...action.users.map((user) => user.id)
            ],
            page: action.page
          }
        },
        users: {
          ...state.users,
          ...action.users.reduce((obj, user) => {
            obj[user.id] = user;
            return obj;
          })
        }
      };
    case FETCH_FOLLOWING_IDS:
      return {
        ...state,
        userFollowing: {
          ...state.userFollowing,
          [action.userId]: {
            ...state.userFollowing[action.userId],
            items: action.usersIds
          }
        }
      };
    default:
      return state;
  }
}

function addFollowersIds(state, action) {

}

function addFollowersUsers(state, action) {

}

function followers(state, action) {

}

function follow(state = [], action) {
  switch (action.type) {
    case FETCH_FOLLOWING:
      return {
        ...state,
        userFollowing: {
          ...state.userFollowing,
          [action.userId]: {
            items: [
              ...state.userFollowing[action.userId],
              ...action.users.map((user) => user.id)
            ],
            page: action.page
          }
        },
        users: {
          ...state.users,
          ...action.users.reduce((obj, user) => {
            obj[user.id] = user;
            return obj;
          })
        }
      };
    case FETCH_FOLLOWING_IDS:
      return {
        ...state,
        following: following(state.following, action)
      };
      return {
        ...state,
        userFollowing: {
          ...state.userFollowing,
          [action.userId]: {
            ...state.userFollowing[action.userId],
            items: action.usersIds
          }
        }
      };
    case FETCH_FOLLOWERS:
      return {
        ...state,
        userFollowers: {
          ...state.userFollowers,
          [action.userId]: {
            items: [
              ...state.userFollowers[action.userId],
              ...action.users.map((user) => user.id)
            ],
            page: action.page
          }
        }
      };
    case FETCH_FOLLOWERS_IDS:
      return {
        ...state,
        userFollowers: {
          ...state.userFollowers,
          [action.userId]: {
            ...state.userFollowers[action.userId],
            items: action.usersIds
          }
        }
      };
    default:
      return state;
  }
}

export default follow;
