import React, {useState, useEffect, useCallback} from 'react';
import Link from '../../shared/router/link';
import Avatar from '../../shared/components/avatar/avatar';
import {useToast} from '../../shared/components/toast/toast';
import APIClient from '../../shared/services/apiclient';
import { AlertTriangle, ArrowLeft, Trash2, Repeat, Heart } from 'lucide-react';

const apiClient = new APIClient();

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${diffDay}d`;
}

function PostDetail(props) {
  const toast = useToast();
  const postId = props.postId;
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const userId = JSON.parse(localStorage.getItem('userId') || 'null');
    setCurrentUserId(userId);
  }, []);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    apiClient.getPost(postId)
      .then((data) => {
        setPost(data);
        return apiClient.getUser(data.userId);
      })
      .then((userData) => setAuthor(userData))
      .catch(() => toast.error('Failed to load post.'))
      .finally(() => setIsLoading(false));
  }, [postId, toast]);

  const handleLike = useCallback(async () => {
    if (!post) return;
    try {
      if (post.liked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }
      const updated = await apiClient.getPost(post.id);
      setPost(updated);
    } catch {
      toast.error('Action failed.');
    }
  }, [post, toast]);

  const handleRepost = useCallback(async () => {
    if (!post) return;
    try {
      if (post.reposted) {
        await apiClient.removeRepost(post.id);
      } else {
        await apiClient.repostPost(post.id);
      }
      const updated = await apiClient.getPost(post.id);
      setPost(updated);
    } catch {
      toast.error('Action failed.');
    }
  }, [post, toast]);

  const handleDelete = useCallback(async () => {
    if (!post || !window.confirm('Delete this post?')) return;
    try {
      await apiClient.deletePost(post.id);
      toast.success('Post deleted.');
      props.onDeleted && props.onDeleted();
    } catch {
      toast.error('Delete failed.');
    }
  }, [post, toast, props]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="card bg-base-100 border border-base-200 animate-pulse">
          <div className="card-body p-6 space-y-4">
            <div className="flex gap-3">
              <div className="skeleton h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="flex gap-6">
              <div className="skeleton h-8 w-16" />
              <div className="skeleton h-8 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post || !author) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body items-center text-center py-12">
            <AlertTriangle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-base-content/60">Post not found.</p>
            <Link href="/" className="btn btn-primary btn-sm mt-4">Back to Feed</Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnPost = currentUserId && post.userId === currentUserId;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-4">
        <Link href="/" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-6">
          <div className="flex items-start gap-3">
            <Link href={`/@${author.username}`}>
              <Avatar name={author.name} size="lg" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/@${author.username}`} className="font-bold text-lg hover:underline">
                    {author.name}
                  </Link>
                  <span className="text-sm text-base-content/50">@{author.username}</span>
                  <span className="text-sm text-base-content/30">· {formatRelativeTime(post.created)}</span>
                </div>
                {isOwnPost && (
                  <button
                    className="btn btn-ghost btn-xs text-base-content/30 hover:text-error p-1 h-auto hover:scale-110 active:scale-90 transition-transform duration-150"
                    onClick={handleDelete}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-4 text-lg whitespace-pre-wrap leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-base-200">
                <button
                  className={`btn btn-ghost btn-sm gap-1 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.reposted ? 'text-success' : 'text-base-content/40 hover:text-success'}`}
                  onClick={handleRepost}
                >
                  <Repeat className="h-5 w-5" />
                  {post.reposts}
                </button>
                <button
                  className={`btn btn-ghost btn-sm gap-1 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 ${post.liked ? 'text-error' : 'text-base-content/40 hover:text-error'}`}
                  onClick={handleLike}
                >
                  <Heart className="h-5 w-5" fill={post.liked ? 'currentColor' : 'none'} />
                  {post.likes}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostDetail;
