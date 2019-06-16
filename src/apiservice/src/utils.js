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
    users.push(this.itemToUser(item));
  }
}

export function itemToPost(item) {
  const post = {
    id: item.getId(),
    content: item.getContent(),
    user_id: item.getUserId(),
    likes: item.getLikes(),
    liked: item.getLiked(),
    retweets: item.getRetweets(),
    retweeted: item.getRetweeted(),
    date_created: item.getDateCreated()
  };
  return post;
}

export function itemsToPosts(items) {
  const posts = [];
  for (const item of items) {
    const post = this.itemToPost(item);
    posts.push(post);
  }
  return posts;
}
