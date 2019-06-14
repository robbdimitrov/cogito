// State

const initialState = {
  count: 0,
  items: [],
  page: 0
};

// Functions

export function addItems(state = initialState, items, page = 0) {
  return {
    ...state,
    items: [...state.items, ...items],
    page
  };
}

export function addItem(state = initialState, item) {
  return {
		...state,
		count: state.count + 1,
    items: [...state.items, item],
  };
}

export function removeItem(state = initialState, item) {
	return {
		...state,
		count: state.count - 1,
		items: state.items.filter((x) => x !== item)
	}
}

export function userProperties(user) {
  return {
    posts: {count: user.posts},
    likes: {count: user.likes},
    following: {count: user.following},
    followers: {count: user.followers}
  };
}
