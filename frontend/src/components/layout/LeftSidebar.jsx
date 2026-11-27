import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  BookOpen,
  Users,
  Bookmark,
  Bell,
  User,
  MessageSquare,
  ShieldAlert,
  Plus,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Layers,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';

export default function LeftSidebar({ onOpenCreate, darkMode, toggleDarkMode, mobileOpen = false, onCloseMobile = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-semibold text-[13.5px] transition-all cursor-pointer ${
      isActive
        ? 'bg-[#fff0ee] dark:bg-rose-950/40 text-[#c65d59] dark:text-rose-300 shadow-2xs font-bold'
        : 'text-[#39425b] dark:text-slate-300 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 hover:text-[#17213f] dark:hover:text-white'
    }`;

  const isStaff =
    user?.role === 'admin' ||
    user?.platformRole === 'admin' ||
    user?.role === 'moderator' ||
    user?.platformRole === 'moderator';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 z-50 md:z-40 w-[270px] md:w-auto h-screen border-r border-[#e9e9ed] dark:border-slate-800 p-5 lg:p-6 flex flex-col justify-between bg-white dark:bg-slate-900 transition-transform duration-200 overflow-y-auto ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
      <div>
        {/* Brand header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#f0f0f2] dark:border-slate-800 gap-2">
          <Link
            to="/app"
            onClick={onCloseMobile}
            className="text-2xl font-black tracking-[-1.5px] text-[#17213f] dark:text-white flex items-center gap-2 group shrink-0"
          >
            <img
              src="/orvexa-logo.png"
              alt="Orvexa"
              className="w-7 h-7 rounded-lg object-contain shadow-xs transition-transform duration-200 group-hover:scale-105 shrink-0"
            />
            <span className="shrink-0">orvexa</span>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <Link
              to="/"
              title="Return to Public Landing Page"
              className="text-[10px] font-bold text-[#737b8d] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white px-2 py-1 rounded bg-[#f7f7f8] dark:bg-slate-800 border border-[#e9e9ed] dark:border-slate-700 whitespace-nowrap"
            >
              Landing
            </Link>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="mt-6 space-y-1">
          <NavLink to="/app" end className={navLinkClass} onClick={onCloseMobile}>
            <Compass className="w-4 h-4 stroke-[2.2]" />
            <span>Discover</span>
          </NavLink>

          <NavLink to="/people" className={navLinkClass} onClick={onCloseMobile}>
            <Users className="w-4 h-4 stroke-[2.2]" />
            <span>People</span>
          </NavLink>

          <NavLink to="/knowledge" className={navLinkClass} onClick={onCloseMobile}>
            <BookOpen className="w-4 h-4 stroke-[2.2]" />
            <span>Knowledge</span>
          </NavLink>

          <NavLink to="/circles" className={navLinkClass} onClick={onCloseMobile}>
            <Layers className="w-4 h-4 stroke-[2.2]" />
            <span>Circles</span>
          </NavLink>

          <NavLink to="/library" className={navLinkClass} onClick={onCloseMobile}>
            <Bookmark className="w-4 h-4 stroke-[2.2]" />
            <span>My Library</span>
          </NavLink>

          <NavLink to="/notifications" className={navLinkClass} onClick={onCloseMobile}>
            <Bell className="w-4 h-4 stroke-[2.2]" />
            <span>Notifications</span>
          </NavLink>

          <NavLink to="/messages" className={navLinkClass} onClick={onCloseMobile}>
            <MessageSquare className="w-4 h-4 stroke-[2.2]" />
            <span>Messages</span>
          </NavLink>

          <NavLink to="/profile" className={navLinkClass} onClick={onCloseMobile}>
            <User className="w-4 h-4 stroke-[2.2]" />
            <span>My Profile</span>
          </NavLink>

          {isStaff && (
            <NavLink to="/admin" className={navLinkClass} onClick={onCloseMobile}>
              <ShieldAlert className="w-4 h-4 stroke-[2.2] text-[#c65d59]" />
              <span className="text-[#c65d59]">
                {user?.platformRole === 'moderator' || user?.role === 'moderator'
                  ? 'Moderation'
                  : 'Admin Panel'}
              </span>
            </NavLink>
          )}
        </nav>

        {/* Create Action Button */}
        <button
          onClick={() => {
            onCloseMobile();
            onOpenCreate();
          }}
          className="w-full mt-6 bg-[#e66c68] hover:bg-[#d55e5a] text-white text-[13px] font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create</span>
        </button>
      </div>

      {/* User identity & dropdown or Guest login prompt */}
      <div className="pt-4 border-t border-[#f0f0f2] dark:border-slate-800 mt-6">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-[#f7f7f8] dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  initials={user.initials || 'OP'}
                  color={user.avatarColor || 'purple'}
                  src={user.avatar}
                  size="w-9 h-9 text-xs font-bold"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#17213f] dark:text-white truncate">
                    {user.displayName || 'Orvexa User'}
                  </div>
                  <div className="text-[11px] text-[#737b8d] dark:text-slate-400 truncate">
                    @{user.username || 'user'}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#737b8d] dark:text-slate-400 shrink-0" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-2xl border border-[#e9e9ed] dark:border-slate-700 shadow-xl p-1.5 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#17213f] dark:text-white hover:bg-[#f7f7f8] dark:hover:bg-slate-700 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#bd625e] hover:bg-[#fff0ee] dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-[#f7f7f8] dark:bg-slate-800/60 rounded-2xl border border-[#e9e9ed] dark:border-slate-700 text-center space-y-2">
            <p className="text-[11px] font-semibold text-[#737b8d] dark:text-slate-400">
              Browsing as Guest Preview
            </p>
            <div className="flex gap-2">
              <Link
                to="/login"
                className="flex-1 py-1.5 bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-[11px] font-bold rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="flex-1 py-1.5 bg-white dark:bg-slate-700 hover:bg-[#f0f0f2] text-[#17213f] dark:text-white text-[11px] font-bold rounded-xl border border-[#e9e9ed] dark:border-slate-600 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
