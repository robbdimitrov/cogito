'use client';

import React, {useState, useEffect} from 'react';
import ControlBar from '@/app/[username]/[[...tab]]/controlbar';
import UserHeader from '@/app/[username]/[[...tab]]/userheader';

import {usePathname} from 'next/navigation';

const ThoughtList = React.lazy(() => import('@/shared/components/thoughtlist/thoughtlist'));
const UserList = React.lazy(() => import('@/app/[username]/[[...tab]]/userlist'));

import { useAPI } from '@/shared/contexts/apicontext';
import { useRouter } from 'next/navigation';
import type { User, Post } from '@/shared/types';

interface ProfileProps {
  user?: User | null;
  posts?: Post[];
  likes?: Post[];
  following?: User[];
  followers?: User[];
  currentUser?: User | null;
  isLoading?: boolean;
}

function Profile(props: ProfileProps) {
  const apiClient = useAPI();
  const router = useRouter();
  const pathname = usePathname();
  const user = props.user || {name: '', username: '', email: '', posts: 0, following: 0, followers: 0, likes: 0};
  const posts = props.posts || [];
  const likes = props.likes || [];
  const following = props.following || [];
  const followers = props.followers || [];
  const { currentUser } = props;

  const handleLike = async (post: Post) => {
    try {
      post.liked ? await apiClient.unlikePost(post.id) : await apiClient.likePost(post.id);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleRepost = async (post: Post) => {
    try {
      post.reposted ? await apiClient.removeRepost(post.id) : await apiClient.repostPost(post.id);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleFollow = async (userId: string) => {
    try {
      await apiClient.followUser(userId);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await apiClient.unfollowUser(userId);
      router.refresh();
    } catch (e: unknown) {}
  };

  const renderTabContent = (items: unknown[] | undefined, emptyMessage: string, renderFn: () => React.ReactNode) => {
    const isTabEmpty = !items || items.length === 0;
    if (isTabEmpty) {
      return (
        <div className="text-center py-12 border-2 border-dashed border-base-300 rounded-2xl bg-base-100/50">
          <p className="text-slate-500 font-medium">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="relative">
        {renderFn()}
      </div>
    );
  };

  const resolveComponent = () => {
    if (pathname.endsWith('/following')) {
      return renderTabContent(
        following,
        'Not following anyone yet.',
        () => <UserList users={following} onFollow={handleFollow} onUnfollow={handleUnfollow} currentUserId={currentUser?.id} emptyMessage="Not following anyone yet." />
      );
    } else if (pathname.endsWith('/followers')) {
      return renderTabContent(
        followers,
        'No followers yet.',
        () => <UserList users={followers} onFollow={handleFollow} onUnfollow={handleUnfollow} currentUserId={currentUser?.id} emptyMessage="No followers yet." />
      );
    } else if (pathname.endsWith('/likes')) {
      return renderTabContent(
        likes,
        'No liked thoughts yet.',
        () => <ThoughtList posts={likes} users={[user]} onLike={handleLike} onRepost={handleRepost} onDelete={handleDeletePost} currentUserId={currentUser?.id} emptyMessage="No liked thoughts yet." />
      );
    }
    return renderTabContent(
      posts,
      'No thoughts posted yet.',
      () => <ThoughtList posts={posts} users={[user]} onLike={handleLike} onRepost={handleRepost} onDelete={handleDeletePost} currentUserId={currentUser?.id} emptyMessage="No thoughts yet. Share what's on your mind!" />
    );
  };

  const match = pathname.match(/\/@(\w+)/);
  const pathUsername = match ? match[1] : '';
  const isSameUser = user && user.username && user.username.toLowerCase() === pathUsername.toLowerCase();

  return (
    <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
      <>
        <UserHeader 
          user={user} 
          currentUser={currentUser} 
          onFollow={handleFollow} 
          onUnfollow={handleUnfollow} 
        />
        <ControlBar user={user} />
        <div className="mt-3 sm:mt-4">
          {resolveComponent()}
        </div>
      </>
    </main>
  );
}

export default Profile;
