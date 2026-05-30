import React, {useState, useEffect, useCallback} from 'react';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import UserList from '../../shared/components/userlist/userlist';
import Loading from '../../shared/components/loading/loading';
import {useToast} from '../../shared/components/toast/toast';
import APIClient from '../../shared/services/apiclient';
import { Search } from 'lucide-react';

const apiClient = new APIClient();

function SearchScreen(props) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const userId = JSON.parse(localStorage.getItem('userId') || 'null');
    setCurrentUserId(userId);
  }, []);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const [userData, postData] = await Promise.allSettled([
        apiClient.getUserByUsername(searchQuery.trim()),
        apiClient.getFeed(0),
      ]);

      if (userData.status === 'fulfilled' && userData.value) {
        setUserResults([userData.value]);
      } else {
        setUserResults([]);
      }

      if (postData.status === 'fulfilled') {
        const items = postData.value.items || [];
        const filtered = items.filter((p) =>
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const userIds = [...new Set(filtered.map((p) => p.userId))];
        const userMap = {};
        await Promise.all(
          userIds.map(async (uid) => {
            try {
              userMap[uid] = await apiClient.getUser(uid);
            } catch {
              userMap[uid] = null;
            }
          })
        );

        setPostResults(filtered.map((p) => ({...p, user: userMap[p.userId]})));
      }
    } catch {
      toast.error('Search failed.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleLike = useCallback(async (post) => {
    try {
      if (post.liked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }
      handleSearch(query);
    } catch {
      toast.error('Action failed.');
    }
  }, [query, handleSearch, toast]);

  const handleRepost = useCallback(async (post) => {
    try {
      if (post.reposted) {
        await apiClient.removeRepost(post.id);
      } else {
        await apiClient.repostPost(post.id);
      }
      handleSearch(query);
    } catch {
      toast.error('Action failed.');
    }
  }, [query, handleSearch, toast]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="join w-full shadow-sm">
          <input
            className="input input-bordered join-item flex-1 bg-base-100"
            placeholder="Search users or thoughts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary join-item gap-1" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      </form>

      {isLoading && <Loading />}

      {!isLoading && hasSearched && (
        <>
          {userResults.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">Users</h2>
              <UserList users={userResults} />
            </div>
          )}

          {postResults.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">Thoughts</h2>
              <ThoughtList posts={postResults} users={[{name: '', username: ''}]} onLike={handleLike} onRepost={handleRepost} currentUserId={currentUserId} />
            </div>
          )}

          {userResults.length === 0 && postResults.length === 0 && (
            <div className="card bg-base-100 border border-base-200">
              <div className="card-body items-center text-center py-12">
                <Search className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-slate-600 dark:text-slate-300">No results for "{query}"</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try a different username or keyword</p>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !hasSearched && (
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body items-center text-center py-16">
            <Search className="h-20 w-20 mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-1">Discover people and thoughts</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Search by username or keyword</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchScreen;
