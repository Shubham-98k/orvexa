import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { apiGet } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function RightSidebar({ onOpenCreateIdea }) {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live users from users API, excluding current user
    apiGet('/users?limit=5')
      .then((res) => {
        if (res?.users) {
          const eligible = res.users.filter((u) => u._id !== user?.id && u.username !== user?.username);
          setPeople(eligible.slice(0, 5));
        }
      })
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <aside className="border-l border-[#e9e9ed] p-6 hidden xl:flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto bg-white">
      {/* People to follow */}
      <div className="border border-[#e9e9ed] rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-[#17213f]">
          <span>People to follow</span>
          <Link to="/people-companies" className="text-[11px] text-[#3f5ce8] hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-[#8b92a1]">Loading suggestions...</div>
        ) : people.length === 0 ? (
          <div className="py-3 text-center text-xs text-[#8b92a1]">
            No suggestions yet. As community members join, they will appear here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {people.map((person) => (
              <div key={person._id || person.username} className="flex items-center gap-2.5 py-1">
                <Link to={`/profile/${person.username}`}>
                  <Avatar
                    initials={person.initials || person.displayName?.slice(0, 2).toUpperCase()}
                    color={person.avatarColor || 'blue'}
                    src={person.avatar}
                    size="w-7 h-7 text-[10px]"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${person.username}`}
                    className="text-xs font-bold text-[#17213f] hover:text-[#3f5ce8] truncate block"
                  >
                    {person.displayName}
                  </Link>
                  <div className="text-[10px] text-[#737b8d] truncate">@{person.username}</div>
                </div>
                <Link
                  to={`/profile/${person.username}`}
                  className="text-[11px] font-bold text-[#3f5ce8] hover:underline"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Prompt */}
      <div className="bg-[#eff8f4] border border-[#e4f0ea] rounded-2xl p-4 space-y-2 text-left">
        <div className="text-2xl text-[#5aa789]">✧</div>
        <h3 className="text-sm font-bold text-[#17213f] leading-snug">
          Good ideas grow better together.
        </h3>
        <p className="text-xs text-[#718278] leading-relaxed">
          Bring a question, share what you know, and help the community build something useful.
        </p>
        <button
          onClick={onOpenCreateIdea}
          className="mt-2 bg-white text-[#292724] border border-[#e2dbd0] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#fafafb] transition-colors cursor-pointer"
        >
          Start a discussion →
        </button>
      </div>
    </aside>
  );
}
