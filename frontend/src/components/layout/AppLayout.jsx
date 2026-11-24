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
    <div className="min-h-screen bg-[#f7f7f8] text-[#17213f] font-sans">
      <div className="max-w-[1680px] mx-auto min-h-screen grid grid-cols-1 md:grid-cols-[252px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)_300px] bg-white shadow-sm border-x border-[#e9e9ed]">
        {/* Left Sidebar */}
        <LeftSidebar onOpenCreate={() => handleOpenCreate('Post')} />

        {/* Center Main View (Outlet) */}
        <main className="p-5 sm:p-8 lg:p-10 min-w-0 flex flex-col">
          <Outlet context={{ onOpenCreate: handleOpenCreate, showToast }} />
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          onOpenCreateIdea={() => handleOpenCreate('Discussion')}
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
