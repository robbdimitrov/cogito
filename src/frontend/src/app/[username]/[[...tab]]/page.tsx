import Profile from '@/app/[username]/[[...tab]]/profile';
import { fetchServer, hydratePostAuthors, getCurrentUser } from '@/shared/services/serverapi';

export default async function ProfilePage({ params }) {
  const { username, tab } = await params;
  const currentTab = tab && tab.length > 0 ? tab[0] : '';
  
  let profileUser = null;
  let posts = [];
  let followers = [];
  let following = [];
  let likes = [];
  
  try {
    profileUser = await fetchServer(`/users?username=${username}`);
    if (profileUser && profileUser.id) {
      if (currentTab === 'followers') {
        const data = await fetchServer(`/users/${profileUser.id}/followers?page=0&limit=20`);
        followers = data && data.items ? data.items : [];
      } else if (currentTab === 'following') {
        const data = await fetchServer(`/users/${profileUser.id}/following?page=0&limit=20`);
        following = data && data.items ? data.items : [];
      } else if (currentTab === 'likes') {
        const data = await fetchServer(`/users/${profileUser.id}/likes?page=0`);
        if (data && data.items) likes = await hydratePostAuthors(data.items);
      } else {
        const userPostsData = await fetchServer(`/users/${profileUser.id}/posts?page=0`);
        if (userPostsData && userPostsData.items) {
          posts = await hydratePostAuthors(userPostsData.items);
        }
      }
    }
  } catch (e) {
    console.error('Profile error:', e);
  }

  const currentUser = await getCurrentUser();

  return (
    <Profile 
      user={profileUser} 
      posts={posts} 
      followers={followers}
      following={following}
      likes={likes}
      isLoading={false} 
      currentUser={currentUser}
    />
  );
}
