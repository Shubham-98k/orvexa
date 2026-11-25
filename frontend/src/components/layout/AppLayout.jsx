import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultType, setCreateDefaultType] = useState('Post');
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

  // Register listener for server-sent GUEST_PREVIEW_EXPIRED 403 response
  useEffect(() => {
    setOnGuestPreviewExpired(() => {
      if (!user) {
        setGuestGateOpen(true);
      }
    });
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleOpenCreate = (type = 'Post') => {
    if (!user) {
      // Mutations strictly require authentication
      navigate('/login', { state: { from: location, message: 'Please log in to create content.' } });
      return;
    }
    setCreateDefaultType(type);
    setCreateModalOpen(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-[#17213f]'} font-sans`}>
      <div className={`max-w-[1680px] mx-auto min-h-screen grid grid-cols-1 md:grid-cols-[235px_minmax(0,1fr)] xl:grid-cols-[235px_minmax(0,1fr)_260px] shadow-sm border-x transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#f0f0f4]'
      }`}>
        {/* Left Sidebar */}
        <LeftSidebar
          onOpenCreate={() => handleOpenCreate('Post')}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />

        {/* Center Main View (Outlet) */}
        <main className={`p-4 sm:p-7 min-w-0 flex flex-col transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <Outlet context={{ onOpenCreate: handleOpenCreate, showToast, darkMode, toggleDarkMode }} />
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          onOpenCreateIdea={() => handleOpenCreate('Discussion')}
          onOpenCreateCircle={() => handleOpenCreate('Circle')}
          darkMode={darkMode}
        />
      </div>

      {/* Universal Create Modal */}
      <CreateModal
        isOpen={createModalOpen}
        defaultType={createDefaultType}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#202a45] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
