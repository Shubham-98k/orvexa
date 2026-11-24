import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, UserPlus, UserCheck } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function PeopleView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      apiGet(`/users?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => {
          const raw = res?.users || [];
          // Exclude current user from results if logged in
          const filtered = user ? raw.filter((p) => p._id !== user.id && p._id !== user._id && p.username !== user.username) : raw;
          setPeople(filtered);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load people');
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleToggleFollowUser = async (targetUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/users/${targetUserId}/follow`, {});
      setPeople((prev) =>
        prev.map((p) =>
          p._id === targetUserId
            ? { ...p, isFollowing: res.isFollowing, followersCount: res.followersCount }
            : p
        )
      );
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#e9e9ed] rounded-3xl p-6 sm:p-8 bg-white space-y-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#17213f] tracking-tight">
            People
          </h1>
          <p className="text-xs text-[#737b8d] mt-1">
            Discover and connect with thinkers, writers, and contributors across the Orvexa community.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#737b8d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search people by display name or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f7f7f8] border border-[#e9e9ed] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#17213f] focus:outline-none focus:ring-2 focus:ring-[#3f5ce8]"
          />
        </div>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-[#3f5ce8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white border border-[#e9e9ed] rounded-3xl p-8 text-center text-xs text-red-500">
          {error}
        </div>
      ) : people.length === 0 ? (
        <div className="bg-white border border-[#e9e9ed] rounded-3xl p-10 text-center space-y-2">
          <span className="text-3xl">👥</span>
          <p className="text-sm font-bold text-[#17213f]">No people found</p>
          <p className="text-xs text-[#737b8d]">Try searching with a different name or keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {people.map((person) => {
            const isSelf = user && (user.id === person._id || user._id === person._id);
            return (
              <div
                key={person._id}
                className="bg-white border border-[#e9e9ed] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/profile/${person.username}`}>
                      <Avatar
                        initials={person.initials || person.displayName?.slice(0, 2).toUpperCase()}
                        color={person.avatarColor || 'purple'}
                        src={person.avatar}
                        size="w-12 h-12 text-sm font-bold"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={`/profile/${person.username}`}
                        className="font-bold text-sm text-[#17213f] hover:text-[#3f5ce8] truncate block"
                      >
                        {person.displayName}
                      </Link>
                      <div className="text-[11px] text-[#737b8d]">@{person.username}</div>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => handleToggleFollowUser(person._id)}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                        person.isFollowing
                          ? 'bg-[#f7f7f8] hover:bg-[#fee2e2] hover:text-red-600 text-[#17213f] border border-[#e9e9ed]'
                          : 'bg-[#3f5ce8] hover:bg-[#324ecc] text-white shadow-[0_2px_0_#2b41ab]'
                      }`}
                    >
                      {person.isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#525d77] line-clamp-2 leading-relaxed">
                  {person.headline || person.bio || 'Curious mind · Building in public'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f4] text-[11px] text-[#737b8d]">
                  <span>{person.followersCount || 0} followers</span>
                  <Link
                    to={`/profile/${person.username}`}
                    className="font-bold text-[#3f5ce8] hover:underline"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
