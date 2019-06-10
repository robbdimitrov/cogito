export function getToken(req) {
  return req.get('Authorization');
}

export function itemToPost(item) {
  const post = {
    id: item.getId(),
    content: item.getContent(),
    user_id: item.getUserId(),
    likes: item.getLikes(),
    retweets: item.getRetweets(),
    date_created: item.getDateCreated()
  };
  return post;
}

export function itemsToPosts(items) {
  const posts = [];
  for (const item of items) {
    const post = itemToPost(item);
    posts.push(post);
  }
  return posts;
}
