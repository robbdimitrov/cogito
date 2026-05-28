import React, {useState, useEffect, useCallback} from 'react';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import UserList from '../../shared/components/userlist/userlist';
import Loading from '../../shared/components/loading/loading';
import {useToast} from '../../shared/components/toast/toast';
import APIClient from '../../shared/services/apiclient';

const apiClient = new APIClient();

function Search(props) {
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
              <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-3">Users</h2>
              <UserList users={userResults} />
            </div>
          )}

          {postResults.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-3">Thoughts</h2>
              <ThoughtList posts={postResults} users={[{name: '', username: ''}]} onLike={handleLike} onRepost={handleRepost} currentUserId={currentUserId} />
            </div>
          )}

          {userResults.length === 0 && postResults.length === 0 && (
            <div className="card bg-base-100 border border-base-200">
              <div className="card-body items-center text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <p className="text-base-content/60">No results for "{query}"</p>
                <p className="text-sm text-base-content/40 mt-1">Try a different username or keyword</p>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !hasSearched && (
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body items-center text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <h3 className="text-lg font-semibold mb-1">Discover people and thoughts</h3>
            <p className="text-sm text-base-content/50">Search by username or keyword</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;
