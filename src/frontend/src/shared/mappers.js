export function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    posts: user.posts,
    likes: user.likes,
    following: user.following,
    followers: user.followers,
    followed: user.followed,
    created: new Date(user.created)
  };
}

export function mapPost(post) {
  return {
    id: post.id,
    user_id: post.user_id,
    content: post.content,
    likes: post.likes,
    liked: post.liked,
    reposts: post.reposts,
    reposted: post.reposted,
    created: new Date(post.created)
  };
}
