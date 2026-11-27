import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Plus, Compass, BookOpen, Layers, User, Bell } from 'lucide-react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import CreateModal from '../common/CreateModal';
import GuestGateModal from '../auth/GuestGateModal';
import { setOnGuestPreviewExpired } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultType, setCreateDefaultType] = useState('Post');
  const [createCircleId, setCreateCircleId] = useState(null);
  const [createModalNonce, setCreateModalNonce] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [guestGateOpen, setGuestGateOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('orvexa_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('orvexa_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('orvexa_dark_mode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Register listener for server-sent GUEST_PREVIEW_EXPIRED 403 response
  useEffect(() => {
    setOnGuestPreviewExpired(() => {
      if (!user) {
        setGuestGateOpen(true);
      }
    });
  }, [user]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  const handleOpenCreate = (type = 'Post', circleId = null) => {
    if (!user) {
      // Mutations strictly require authentication
      navigate('/login', { state: { from: location, message: 'Please log in to create content.' } });
      return;
    }
    setCreateDefaultType(type);
    setCreateCircleId(circleId);
    setCreateModalNonce((previous) => previous + 1);
    setCreateModalOpen(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-[#17213f]'} font-sans pb-16 md:pb-0`}>
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#e9e9ed] dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/app" className="flex items-center gap-2">
            <img src="/orvexa-logo.png" alt="Orvexa" className="w-6 h-6 object-contain" />
            <span className="font-black text-lg tracking-tight text-[#17213f] dark:text-white">orvexa</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreate('Post')}
            className="bg-[#e66c68] text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </header>

      <div className={`max-w-[1680px] mx-auto min-h-screen grid grid-cols-1 md:grid-cols-[235px_minmax(0,1fr)] xl:grid-cols-[235px_minmax(0,1fr)_260px] shadow-sm border-x transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#f0f0f4]'
      }`}>
        {/* Left Sidebar */}
        <LeftSidebar
          onOpenCreate={() => handleOpenCreate('Post')}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Center Main View (Outlet) */}
        <main className={`p-3.5 sm:p-7 min-w-0 flex flex-col transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <Outlet context={{ onOpenCreate: handleOpenCreate, showToast, darkMode, toggleDarkMode }} />
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          onOpenCreateIdea={() => handleOpenCreate('Discussion')}
          onOpenCreateCircle={() => handleOpenCreate('Circle')}
          darkMode={darkMode}
        />
      </div>

      {/* Mobile Bottom Quick-Action Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#e9e9ed] dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg">
        <Link
          to="/app"
          className="flex flex-col items-center gap-0.5 text-slate-600 dark:text-slate-400 hover:text-[#3f5ce8] dark:hover:text-blue-400 py-1 px-2"
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px] font-bold">Discover</span>
        </Link>
        <Link
          to="/knowledge"
          className="flex flex-col items-center gap-0.5 text-slate-600 dark:text-slate-400 hover:text-[#3f5ce8] dark:hover:text-blue-400 py-1 px-2"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] font-bold">Knowledge</span>
        </Link>
        <button
          type="button"
          onClick={() => handleOpenCreate('Post')}
          className="w-10 h-10 rounded-full bg-[#e66c68] text-white flex items-center justify-center -mt-4 shadow-md cursor-pointer hover:bg-[#d55e5a] transition-transform active:scale-95"
          aria-label="Create new item"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
        <Link
          to="/circles"
          className="flex flex-col items-center gap-0.5 text-slate-600 dark:text-slate-400 hover:text-[#3f5ce8] dark:hover:text-blue-400 py-1 px-2"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-bold">Circles</span>
        </Link>
        <Link
          to="/profile"
          className="flex flex-col items-center gap-0.5 text-slate-600 dark:text-slate-400 hover:text-[#3f5ce8] dark:hover:text-blue-400 py-1 px-2"
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-bold">Profile</span>
        </Link>
      </nav>

      {/* Universal Create Modal */}
      <CreateModal
        key={createModalNonce}
        isOpen={createModalOpen}
        defaultType={createDefaultType}
        defaultCircleId={createCircleId}
        onClose={() => setCreateModalOpen(false)}
        onItemCreated={(item, type) => {
          showToast(`${type} published successfully!`);
          window.location.reload();
        }}
      />

      {/* Guest Preview Expiry Gate Modal */}
      <GuestGateModal
        isOpen={guestGateOpen}
        onClose={() => setGuestGateOpen(false)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#202a45] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
