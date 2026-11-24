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
            className="text-[11px] font-semibold text-[#737b8d] hover:text-[#17213f] px-2 py-1 rounded-md bg-[#f7f7f8] border border-[#e9e9ed] transition-colors"
          >
            Landing ↗
          </Link>
        </div>

        {/* Section 1: YOUR SPACE */}
        <div className="pt-5 pb-2 text-[10px] font-extrabold tracking-[1.25px] text-[#9298a7] uppercase">
          Your Space
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/app" end className={navLinkClass}>
            <Compass className="w-4 h-4 stroke-[2.2]" />
            <span>Discover</span>
          </NavLink>
          <NavLink to="/knowledge" className={navLinkClass}>
            <BookOpen className="w-4 h-4 stroke-[2.2]" />
            <span>Knowledge</span>
          </NavLink>
          <NavLink to="/circles" className={navLinkClass}>
            <Users className="w-4 h-4 stroke-[2.2]" />
            <span>Circles</span>
          </NavLink>
        </nav>

        {/* Section 2: PERSONAL */}
        <div className="pt-6 pb-2 text-[10px] font-extrabold tracking-[1.25px] text-[#9298a7] uppercase">
          Personal
        </div>
        <nav className="flex flex-col gap-1">
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

          {(user?.platformRole === 'admin' || user?.platformRole === 'moderator') && (
            <NavLink to="/admin" className={navLinkClass}>
              <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
              <span>Admin & Safety</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Sidebar Bottom: Create + User Card */}
      <div className="pt-5 border-t border-[#f0f0f2] mt-6 flex flex-col gap-3 relative">
        <button
          onClick={onOpenCreate}
          className="w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-3 px-4 rounded-xl font-bold text-[13.5px] shadow-[0_4px_10px_rgba(63,92,232,0.22)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create something</span>
        </button>

        {/* User Card with dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#f7f7f8] transition-colors cursor-pointer text-left"
          >
            <Avatar
              initials={user?.initials || 'OP'}
              color={user?.avatarColor || 'purple'}
              src={user?.avatar}
              size="w-9 h-9 text-xs"
            />
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-[#17213f] truncate">
                {user?.displayName || 'Signed In User'}
              </div>
              <div className="text-[10px] text-[#737b8d] truncate">
                @{user?.username || 'member'}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#8b92a1] shrink-0" />
          </button>

          {/* User Popover Menu */}
          {menuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-2xl shadow-xl border border-[#e9e9ed] p-2 space-y-1 z-50">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-[#17213f] hover:bg-[#f7f7f8] rounded-xl flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-[#737b8d]" />
                <span>View Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-[#bd625e] hover:bg-[#fff0ee] rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
