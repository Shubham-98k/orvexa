import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import PostCard from '../components/discover/PostCard';
import { apiGet, apiPatch, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Edit3, Check, UserPlus, UserCheck, Shield } from 'lucide-react';

export default function ProfileView() {
  const { username: routeUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Determine if viewing own profile or another user's profile
  const isViewingSelf = !routeUsername || (currentUser && routeUsername.toLowerCase() === currentUser.username.toLowerCase());
  const effectiveUsername = routeUsername || currentUser?.username;

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit states for self
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Follow states for others
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!effectiveUsername) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    apiGet(`/users/${effectiveUsername}`)
      .then((res) => {
        const u = res?.user || res;
        setProfileData(u);
        setPosts(res?.posts || []);
        setHeadline(u.headline || '');
        setBio(u.bio || '');
        setIsFollowing(Boolean(u.isFollowing));
        setFollowersCount(u.followersCount || 0);
      })
      .catch((err) => {
        setError(err.message || 'User not found');
      })
      .finally(() => setLoading(false));
  }, [effectiveUsername]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await apiPatch('/users/me', { headline, bio });
      setProfileData((prev) => ({ ...prev, headline: updated.headline, bio: updated.bio }));
      setEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/users/${profileData._id || profileData.id}/follow`, {});
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.followersCount);
    } catch (err) {
      alert(err.message || 'Follow action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-[#3f5ce8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="bg-white border border-[#e9e9ed] rounded-3xl p-10 text-center space-y-3">
        <span className="text-4xl">🔍</span>
        <h2 className="text-lg font-bold text-[#17213f]">{error || 'User not found'}</h2>
        <p className="text-xs text-[#737b8d]">The profile you are looking for does not exist or is private.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="border border-[#e9e9ed] rounded-3xl p-6 sm:p-8 bg-white space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              initials={profileData.initials || 'OP'}
              color={profileData.avatarColor || 'purple'}
              src={profileData.avatar}
              size="w-16 h-16 sm:w-20 sm:h-20 text-xl font-black"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#17213f] leading-snug">
                  {profileData.displayName}
                </h2>
                {profileData.platformRole === 'admin' && (
                  <span className="bg-[#fff0ee] text-[#c65d59] text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-[#737b8d] font-semibold">@{profileData.username}</div>
              <p className="text-xs text-[#38425b] mt-1">
                {profileData.headline || 'Curious mind · Building in public'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {isViewingSelf ? (
              editing ? (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Done'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-[#f7f7f8] hover:bg-[#ececf0] text-[#17213f] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 border border-[#e9e9ed] transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )
            ) : (
              <button
                onClick={handleToggleFollow}
                className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFollowing
                    ? 'bg-[#f7f7f8] hover:bg-[#fee2e2] hover:text-red-600 text-[#17213f] border border-[#e9e9ed]'
                    : 'bg-[#3f5ce8] hover:bg-[#324ecc] text-white shadow-[0_2px_0_#2b41ab]'
                }`}
              >
                {isFollowing ? (
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
        </div>

        {/* Inline Edit or Display Bio */}
        {editing && isViewingSelf ? (
          <div className="space-y-3 pt-3 border-t border-[#f0f0f4]">
            <div>
              <label className="text-[11px] font-bold text-[#737b8d] uppercase tracking-wider block mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
                className="w-full bg-[#f7f7f8] border border-[#e9e9ed] rounded-xl px-3 py-2 text-xs text-[#17213f] focus:outline-none focus:ring-2 focus:ring-[#3f5ce8]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#737b8d] uppercase tracking-wider block mb-1">About</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-[#f7f7f8] border border-[#e9e9ed] rounded-xl px-3 py-2 text-xs text-[#17213f] focus:outline-none focus:ring-2 focus:ring-[#3f5ce8]"
              />
            </div>
          </div>
        ) : (
          profileData.bio && (
            <p className="text-xs text-[#525d77] leading-relaxed pt-2 border-t border-[#f0f0f4]">
              {profileData.bio}
            </p>
          )
        )}

        {/* Real followers & following counts */}
        <div className="flex gap-6 pt-3 text-xs border-t border-[#f0f0f4]">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[#17213f]">{followersCount}</span>
            <span className="text-[#737b8d]">Followers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[#17213f]">{profileData.followingCount || 0}</span>
            <span className="text-[#737b8d]">Following</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[#17213f]">{posts.length}</span>
            <span className="text-[#737b8d]">Posts</span>
          </div>
        </div>
      </div>

      {/* Published Posts by User */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#17213f] uppercase tracking-wider">
            {isViewingSelf ? 'My Activity' : `${profileData.displayName}'s Posts`}
          </h3>
          <span className="text-xs text-[#737b8d]">{posts.length} posts</span>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-[#e9e9ed] rounded-3xl p-8 text-center text-xs text-[#737b8d]">
            No posts published yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
