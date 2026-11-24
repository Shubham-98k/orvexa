import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, Building2, UserPlus, UserCheck, ExternalLink, MessageSquare } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function PeopleCompaniesView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('People'); // 'People' | 'Companies'
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch People or Companies when tab or search changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (activeTab === 'People') {
        apiGet(`/users?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => {
            setPeople(res?.users || []);
          })
          .catch((err) => {
            setError(err.message || 'Failed to load people');
          })
          .finally(() => setLoading(false));
      } else {
        apiGet(`/companies?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => {
            setCompanies(res?.companies || []);
          })
          .catch((err) => {
            setError(err.message || 'Failed to load companies');
          })
          .finally(() => setLoading(false));
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

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

  const handleDirectMessageUser = async (person) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost('/conversations', { recipientId: person._id });
      if (res?.conversation?._id) {
        navigate('/messages', {
          state: {
            conversationId: res.conversation._id,
            recipient: person,
          },
        });
      } else {
        navigate(`/messages?user=${person.username || person._id}`);
      }
    } catch (err) {
      alert(err.message || 'Unable to open message thread.');
    }
  };

  const handleToggleFollowCompany = async (companyId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/companies/${companyId}/follow`, {});
      setCompanies((prev) =>
        prev.map((c) =>
          c._id === companyId
            ? { ...c, isFollowing: res.isFollowing, followersCount: res.followersCount }
            : c
        )
      );
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="border border-[#e9e9ed] rounded-3xl p-6 sm:p-8 bg-white space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#17213f] tracking-tight">
              People & Companies
            </h1>
            <p className="text-xs text-[#737b8d] mt-1">
              Discover thinkers, builders, and organizations shaping the future of work and knowledge.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-[#f7f7f8] p-1 rounded-2xl border border-[#e9e9ed] self-stretch sm:self-auto">
            <button
              onClick={() => { setActiveTab('People'); setSearchQuery(''); }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'People'
                  ? 'bg-white text-[#17213f] shadow-xs'
                  : 'text-[#737b8d] hover:text-[#17213f]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>People</span>
            </button>
            <button
              onClick={() => { setActiveTab('Companies'); setSearchQuery(''); }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'Companies'
                  ? 'bg-white text-[#17213f] shadow-xs'
                  : 'text-[#737b8d] hover:text-[#17213f]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#737b8d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'People' ? 'Search by name or @username...' : 'Search companies by name or industry...'}
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
      ) : activeTab === 'People' ? (
        /* People Grid */
        people.length === 0 ? (
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
                      <Avatar
                        initials={person.initials || 'OP'}
                        color={person.avatarColor || 'purple'}
                        src={person.avatar}
                        size="w-12 h-12 text-sm font-bold"
                      />
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDirectMessageUser(person)}
                          title={`Message ${person.displayName}`}
                          className="text-xs font-bold p-1.5 rounded-xl border border-[#e9e9ed] bg-white text-[#737b8d] hover:text-[#3f5ce8] hover:bg-[#f7f7f8] transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
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
                      </div>
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
        )
      ) : (
        /* Companies Grid */
        companies.length === 0 ? (
          <div className="bg-white border border-[#e9e9ed] rounded-3xl p-10 text-center space-y-2">
            <span className="text-3xl">🏢</span>
            <p className="text-sm font-bold text-[#17213f]">No companies found</p>
            <p className="text-xs text-[#737b8d]">Try searching with a different company name or industry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <div
                key={company._id}
                className="bg-white border border-[#e9e9ed] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#f0f2fe] text-[#3f5ce8] flex items-center justify-center font-black text-sm shrink-0">
                      {company.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[#17213f] truncate">
                        {company.name}
                      </h3>
                      <div className="text-[11px] text-[#737b8d]">{company.industry}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFollowCompany(company._id)}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                      company.isFollowing
                        ? 'bg-[#f7f7f8] hover:bg-[#fee2e2] hover:text-red-600 text-[#17213f] border border-[#e9e9ed]'
                        : 'bg-[#3f5ce8] hover:bg-[#324ecc] text-white shadow-[0_2px_0_#2b41ab]'
                    }`}
                  >
                    {company.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>

                <p className="text-xs text-[#525d77] line-clamp-2 leading-relaxed">
                  {company.description || 'Innovative organization publishing research and ideas on Orvexa.'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f4] text-[11px] text-[#737b8d]">
                  <span>{company.followersCount || 0} followers</span>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3f5ce8] flex items-center gap-1 hover:underline"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
