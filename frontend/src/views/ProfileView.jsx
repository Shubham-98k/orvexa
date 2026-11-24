import React, { useState, useEffect } from 'react';
import Avatar from '../components/common/Avatar';
import PostCard from '../components/discover/PostCard';
import { apiGet, apiPatch } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Edit3, Check } from 'lucide-react';

export default function ProfileView() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(user?.headline || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.username) {
      apiGet(`/posts`)
        .then((res) => {
          const userPosts = (res?.posts || []).filter(
            (p) => p.authorId === user.id || p.authorName === user.displayName
          );
          setPosts(userPosts);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiPatch('/users/me', { headline, bio });
      setEditing(false);
    } catch {
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="border border-[#e9e9ed] rounded-3xl p-6 sm:p-8 bg-white space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              initials={user?.initials || 'OP'}
              color={user?.avatarColor || 'purple'}
              src={user?.avatar}
              size="w-16 h-16 sm:w-20 sm:h-20 text-xl font-black"
            />
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#17213f] leading-snug">
                {user?.displayName || 'Orvexa User'}
              </h2>
              <div className="text-xs text-[#737b8d] font-semibold">@{user?.username || 'user'}</div>
              <p className="text-xs text-[#38425b] mt-1">
                {user?.headline || 'Curious mind · Building in public'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (editing) handleSaveProfile();
              else setEditing(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#e9e9ed] bg-white hover:bg-[#f7f7f8] text-[#17213f] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {editing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{editing ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Profile'}</span>
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 pt-3 border-t border-[#f0f0f2]">
            <div>
              <label className="block text-[11px] font-bold text-[#17213f] mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#17213f] mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#4a5265] leading-relaxed pt-2 border-t border-[#f0f0f2]">
            {user?.bio || 'Exploring ideas, connecting perspectives and learning from the community.'}
          </p>
        )}

        <div className="flex items-center gap-6 pt-3 border-t border-[#f0f0f2] text-xs">
          <div>
            <b className="font-extrabold text-[#17213f]">{user?.followersCount || 0}</b>{' '}
            <span className="text-[#737b8d]">Followers</span>
          </div>
          <div>
            <b className="font-extrabold text-[#17213f]">{user?.followingCount || 0}</b>{' '}
            <span className="text-[#737b8d]">Following</span>
          </div>
          <div>
            <b className="font-extrabold text-[#17213f]">{posts.length}</b>{' '}
            <span className="text-[#737b8d]">Published Posts</span>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#6e778a] uppercase tracking-wider">Your Contributions</h3>
        {posts.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl">
            You haven't published any posts yet.
          </div>
        ) : (
          posts.map((p) => <PostCard key={p._id} post={p} />)
        )}
      </div>
    </div>
  );
}
