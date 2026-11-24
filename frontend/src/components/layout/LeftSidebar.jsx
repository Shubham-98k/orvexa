import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  BookOpen,
  Users,
  Bookmark,
  Clock,
  User,
  MessageSquare,
  ShieldAlert,
  Plus,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';

export default function LeftSidebar({ onOpenCreate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all cursor-pointer ${
      isActive
        ? 'bg-[#fff0ee] text-[#c65d59] shadow-2xs font-bold'
        : 'text-[#39425b] hover:bg-[#f7f7f8] hover:text-[#17213f]'
    }`;

  return (
    <aside className="border-r border-[#e9e9ed] p-5 lg:p-6 flex flex-col justify-between sticky top-0 h-auto md:h-screen bg-white z-40">
      <div>
        {/* Brand header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#f0f0f2]">
          <Link
            to="/app"
            className="text-2xl font-black tracking-[-1.5px] text-[#17213f] flex items-center gap-1 group"
          >
            <span>orvexa</span>
            <span className="text-[#e66c68] transition-transform duration-300 group-hover:rotate-45">✳</span>
          </Link>
          <Link
            to="/"
            title="Return to Public Landing Page"
            className="text-[10px] font-bold text-[#737b8d] hover:text-[#17213f] px-2 py-1 rounded bg-[#f7f7f8] border border-[#e9e9ed]"
          >
            Landing
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="mt-6 space-y-1">
          <NavLink to="/app" end className={navLinkClass}>
            <Compass className="w-4 h-4 stroke-[2.2]" />
            <span>Discover</span>
          </NavLink>

          <NavLink to="/people-companies" className={navLinkClass}>
            <Building2 className="w-4 h-4 stroke-[2.2]" />
            <span>People & Companies</span>
          </NavLink>

          <NavLink to="/knowledge" className={navLinkClass}>
            <BookOpen className="w-4 h-4 stroke-[2.2]" />
            <span>Knowledge</span>
          </NavLink>

          <NavLink to="/circles" className={navLinkClass}>
            <Users className="w-4 h-4 stroke-[2.2]" />
            <span>Circles</span>
          </NavLink>

          <NavLink to="/library" className={navLinkClass}>
            <Bookmark className="w-4 h-4 stroke-[2.2]" />
            <span>My Library</span>
          </NavLink>

          <NavLink to="/activity" className={navLinkClass}>
            <Clock className="w-4 h-4 stroke-[2.2]" />
            <span>Activity</span>
          </NavLink>

          <NavLink to="/messages" className={navLinkClass}>
            <MessageSquare className="w-4 h-4 stroke-[2.2]" />
            <span>Messages</span>
          </NavLink>

          <NavLink to="/profile" className={navLinkClass}>
            <User className="w-4 h-4 stroke-[2.2]" />
            <span>My Profile</span>
          </NavLink>

          {(user?.role === 'admin' || user?.platformRole === 'admin') && (
            <NavLink to="/admin" className={navLinkClass}>
              <ShieldAlert className="w-4 h-4 stroke-[2.2] text-[#c65d59]" />
              <span className="text-[#c65d59]">Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Create Action Button */}
        <button
          onClick={onOpenCreate}
          className="w-full mt-6 bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-[13px] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create</span>
        </button>
      </div>

      {/* User identity & dropdown or Guest login prompt */}
      <div className="pt-4 border-t border-[#f0f0f2] mt-6">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#f7f7f8] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  initials={user.initials || 'OP'}
                  color={user.avatarColor || 'purple'}
                  src={user.avatar}
                  size="w-9 h-9 text-xs font-bold"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#17213f] truncate">
                    {user.displayName || 'Orvexa User'}
                  </div>
                  <div className="text-[11px] text-[#737b8d] truncate">@{user.username || 'user'}</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#737b8d] shrink-0" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#e9e9ed] rounded-xl shadow-lg p-1.5 space-y-1 z-50">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#17213f] hover:bg-[#f7f7f8]"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] text-[#737b8d] font-semibold">Guest Preview Mode</div>
            <div className="flex gap-2">
              <Link
                to="/login"
                className="flex-1 bg-[#f7f7f8] hover:bg-[#ececf0] text-[#17213f] text-xs font-bold py-2 rounded-lg text-center border border-[#e9e9ed]"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="flex-1 bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-xs font-bold py-2 rounded-lg text-center"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
