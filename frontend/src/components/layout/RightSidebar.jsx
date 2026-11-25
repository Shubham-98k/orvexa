import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  ArrowDown,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { apiGet, apiPost } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_PEOPLE = [
  {
    _id: 'u-jamie',
    username: 'jamie',
    displayName: 'Jamie Scott',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    _id: 'u-alicia',
    username: 'alicia',
    displayName: 'Alicia Lee',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    _id: 'u-devon',
    username: 'devon',
    displayName: 'Devon Martinez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    _id: 'u-sarah',
    username: 'sarah',
    displayName: 'Sarah Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  },
  {
    _id: 'u-chloe',
    username: 'chloe',
    displayName: 'Chloe Patel',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
];

const CIRCLES_PREVIEWS = [
  {
    name: 'Tech Enthusiasts',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80',
    slug: 'tech-enthusiasts',
  },
  {
    name: 'Design Lovers',
    image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=200&q=80',
    slug: 'design-lovers',
  },
  {
    name: 'AI & Future',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
    slug: 'ai-and-future',
  },
];

export default function RightSidebar({ onOpenCreateIdea, onOpenCreateCircle, darkMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    apiGet('/users?limit=6')
      .then((res) => {
        if (res?.users && res.users.length > 0) {
          const eligible = res.users
            .filter((u) => u._id !== user?.id && u.username !== user?.username)
            .slice(0, 5);
          if (eligible.length > 0) {
            setPeople(eligible);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  const handleToggleFollow = async (person) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const isCurrentlyFollowing = Boolean(followingMap[person._id]);
    setFollowingMap((prev) => ({
      ...prev,
      [person._id]: !isCurrentlyFollowing,
    }));
    try {
      await apiPost(`/users/${person._id}/follow`, {});
    } catch {
      // rollback on error
      setFollowingMap((prev) => ({
        ...prev,
        [person._id]: isCurrentlyFollowing,
      }));
    }
  };

  return (
    <aside className="border-l border-[#f0f0f4] dark:border-slate-800 p-3.5 hidden xl:flex flex-col gap-4 sticky top-0 h-screen overflow-y-auto bg-white dark:bg-slate-900 transition-colors font-sans no-scrollbar w-full">
      {/* 1. People to follow Card */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-[#17213f] dark:text-white">People to follow</h3>
          <Link
            to="/people"
            className="text-[11px] font-bold text-[#6d28d9] dark:text-purple-400 hover:underline flex items-center gap-0.5"
          >
            <span>See all</span>
            <span>→</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          {people.map((person) => {
            const isFollowing = Boolean(followingMap[person._id]);
            return (
              <div key={person._id || person.username} className="flex items-center justify-between gap-2">
                <Link
                  to={`/profile/${person.username}`}
                  className="flex items-center gap-2 min-w-0 flex-1 group"
                >
                  <img
                    src={person.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={person.displayName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#17213f] dark:text-slate-100 group-hover:text-[#6d28d9] truncate leading-tight">
                      {person.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">@{person.username}</div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => handleToggleFollow(person)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    isFollowing
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      : 'bg-[#ede9fe] text-[#6d28d9] dark:bg-purple-950/60 dark:text-purple-300 hover:bg-[#ddd6fe]'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Idea Trail Card (Matching Reference Screenshot 3) */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#e66c68]" />
            <h3 className="text-xs font-black text-[#17213f] dark:text-white">Idea trail</h3>
          </div>
          <Link
            to="/discover"
            className="text-[11px] font-bold text-[#6d28d9] dark:text-purple-400 hover:underline flex items-center gap-0.5"
          >
            <span>See more</span>
            <span>→</span>
          </Link>
        </div>

        {/* Workflow Progression Box */}
        <div className="space-y-1.5 text-left">
          {/* Step 1: Starting Discussion */}
          <div
            onClick={onOpenCreateIdea}
            className="p-2.5 rounded-2xl bg-[#f5f3ff] dark:bg-purple-950/30 border border-[#e9e4ff] dark:border-purple-900/40 cursor-pointer hover:shadow-xs transition-shadow"
          >
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-[#7c3aed] dark:text-purple-300 shrink-0 mt-0.5">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-[#581c87] dark:text-purple-200">
                  Starting discussion
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                  How can we make remote work feel less isolating?
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-0.5">
            <span className="text-slate-400 font-bold text-xs">↓</span>
          </div>

          {/* Step 2: Community Insights */}
          <div className="p-2.5 rounded-2xl bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fef3c7] dark:border-amber-900/40">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-[#d97706] dark:text-amber-300 shrink-0 mt-0.5">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-[#78350f] dark:text-amber-200">
                  Community insights
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                  Sharing tips, experiences and solutions.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-0.5">
            <span className="text-slate-400 font-bold text-xs">↓</span>
          </div>

          {/* Step 3: Published Knowledge */}
          <Link
            to="/knowledge"
            className="p-2.5 rounded-2xl bg-[#ecfdf5] dark:bg-emerald-950/30 border border-[#d1fae5] dark:border-emerald-900/40 block hover:shadow-xs transition-shadow"
          >
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-[#059669] dark:text-emerald-300 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-[#064e3b] dark:text-emerald-200">
                  Published Knowledge
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                  A complete guide for remote teams.
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Your Circles Card (Matching Reference Screenshot 3) */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-[#17213f] dark:text-white">Your Circles</h3>
          <Link
            to="/circles"
            className="text-[11px] font-bold text-[#6d28d9] dark:text-purple-400 hover:underline flex items-center gap-0.5"
          >
            <span>See all</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          {CIRCLES_PREVIEWS.map((circle) => (
            <Link
              key={circle.slug}
              to="/circles"
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                <img
                  src={circle.image}
                  alt={circle.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 leading-tight line-clamp-2">
                {circle.name}
              </span>
            </Link>
          ))}

          {/* Create Circle Button */}
          <button
            type="button"
            onClick={onOpenCreateCircle || onOpenCreateIdea}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#f3f0ff] dark:bg-purple-950/40 border border-[#e5deff] dark:border-purple-800 text-[#7c3aed] dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-[9.5px] font-bold text-[#7c3aed] dark:text-purple-300 leading-tight">
              Create Circle
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
