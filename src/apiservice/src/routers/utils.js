export function getToken(req) {
  return req.get('Authorization');
}

export function itemToUser(item) {
  const user = {
    id: item.getId(),
    username: item.getUsername(),
    email: item.getEmail(),
    name: item.getName(),
    bio: item.getBio(),
    avatar: item.getAvatar(),
    posts: item.getPosts(),
    likes: item.getLikes(),
    following: item.getFollowing(),
    followers: item.getFollowers(),
    date_created: item.getDateCreated()
  };
  return user;
}

export function itemsToUsers(items) {
  const users = [];
  for (const item of items) {
    users.push(itemToUser(item));
  }
}
