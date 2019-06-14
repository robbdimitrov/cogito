export function addItems(state = {items: []}, items, page = 0) {
  return {
    ...state,
    items: [...state.items, ...items],
    page
  };
}

export function addItem(state = {items: []}, item) {
  return {
		...state,
		count: state.count + 1,
    items: [...state.items, item],
  };
}

export function removeItem(state = {items: []}, item) {
	const index = state.items.indexOf(item);

	if (index < 0) {
		return state;
	}

	return {
		...state,
		count: state.count - 1,
		items: state.items.splice(index, 1)
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
