import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';

export default function ActivityView() {
  const { showToast } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/notifications')
      .then((res) => setNotifications(res?.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiPost('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('All activity marked as read');
    } catch {
      showToast('Updated status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            PERSONAL FEED
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
            Activity & Notifications
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Stay up to date with conversations, replies, and mentions.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-[#3f5ce8] hover:underline flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#8b92a1]">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2">
          <Bell className="w-8 h-8 text-[#8b92a1] mx-auto opacity-50" />
          <p className="font-semibold text-[#17213f]">No new activity right now.</p>
          <p>When someone mentions you, upvotes your discussion, or replies, it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`border rounded-2xl p-4 flex items-start gap-3.5 transition-colors ${
                n.isRead ? 'border-[#e9e9ed] bg-white' : 'border-[#3f5ce8]/20 bg-[#f7f9ff]'
              }`}
            >
              <Avatar
                initials={n.actorInitials || 'OP'}
                color={n.actorColor || 'purple'}
                size="w-8 h-8 text-xs"
              />
              <div className="flex-1 text-xs leading-relaxed text-[#38425b]">
                <b className="text-[#17213f]">{n.actorName || 'Someone'}</b> {n.title}
                <div className="text-[10px] text-[#9298a7] mt-1">{n.timeText || 'Recent'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
