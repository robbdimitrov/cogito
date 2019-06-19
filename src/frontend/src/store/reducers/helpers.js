// State

/**
 *  Initial state for counter item objects.
 */
const initialState = {
  count: 0,
  items: [],
  page: 0
};

// Functions

/**
 *  Adds items to a counter object.
 */
export function addItems(state = initialState, items, page = 0) {
  return {
    ...state,
    items: addIds(state.items, items),
    page
  };
}

/**
 *  Adds a single item to a counter object.
 */
export function addItem(state = initialState, item) {
  return {
    ...state,
    count: state.count + 1,
    items: addId(state, item)
  };
}

/**
 *  Removes an item from a counter object.
 */
export function removeItem(state = initialState, item) {
  return {
    ...state,
    count: state.count - 1,
    items: removeId(state.items, item)
  }
}

// Collections

/**
 * Adds multiple ids to an ids array.
 */
export function addIds(state, objects) {
  let ids = Object.keys(objects).map(Number);
  let idsToAdd = ids.filter((x) => state.indexOf(x) === -1);
  return [
    ...state,
    ...idsToAdd
  ];
}

/**
 * Adds an id to an ids array.
 */
export function addId(state, id) {
  if (state.indexOf(id) === -1) {
    return [...state, id];
  }
  return state;
}

/**
 * Removes an id from an ids array.
 */
export function removeId(state, id) {
  return state.filter((x) => x !== id);
}

// Collections

/**
 * Adds a single object to the containing object.
 */
export function addObject(state, object) {
  return {
    ...state,
    [object.id]: {
      ...object
    }
  };
}

/**
 * Adds objects to the containing object.
 */
export function addObjects(state, objects) {
  return {
    ...state,
    ...objects.reduce((obj, object) => {
      obj[object.id] = {
        ...object
      };
      return obj;
    })
  };
}

export function updateObject(state, objectId, updates) {
  const object = state[objectId];

  if (!object) {
    return state;
  }

  return {
    ...state,
    [objectId]: {
      ...object,
      ...updates
    }
  };
}

/**
 * Removed an object with the matching objectId key from the containing object.
 */
export function removeObject(state, objectId) {
  return Object.keys(state).reduce((obj, key) => {
    if (key !== objectId) {
      obj[key] = state[key];
    }
    return obj;
  }, {});
}

// User

/**
 * Generates counted objects for users.
 */
export function userProperties(user) {
  return {
    posts: { count: user.posts },
    likes: { count: user.likes },
    following: { count: user.following },
    followers: { count: user.followers }
  };
}
