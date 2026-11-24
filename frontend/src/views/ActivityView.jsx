import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPatch, apiPost } from '../api/client';

export default function ActivityView() {
  const { showToast } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    replies: true,
    likes: true,
    follows: true,
    mentions: true,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet('/notifications'),
      apiGet('/notifications/preferences'),
    ])
      .then(([notificationsRes, preferencesRes]) => {
        setNotifications(notificationsRes?.notifications || []);
        setPreferences(preferencesRes?.preferences || {
          replies: true,
          likes: true,
          follows: true,
          mentions: true,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePreference = async (key) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);
    setSavingPreferences(true);
    try {
      const res = await apiPatch('/notifications/preferences', nextPreferences);
      setPreferences(res.preferences);
      showToast(`${key === 'replies' ? 'Reply' : key[0].toUpperCase() + key.slice(1)} notifications ${nextPreferences[key] ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setPreferences(preferences);
      showToast(err.message || 'Unable to update notification settings');
    } finally {
      setSavingPreferences(false);
    }
  };

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

      <div className="border border-[#e9e9ed] rounded-2xl bg-white p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-[#17213f]">Notification settings</h2>
          <p className="text-xs text-[#737b8d] mt-1">Choose which activity appears in this tab.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['replies', 'Replies and contributions'],
            ['likes', 'Likes'],
            ['follows', 'New followers'],
            ['mentions', 'Mentions'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={savingPreferences}
              onClick={() => updatePreference(key)}
              className="flex items-center justify-between rounded-xl border border-[#e9e9ed] px-3.5 py-3 text-xs font-semibold text-[#38425b] hover:bg-[#fafafb]"
            >
              <span>{label}</span>
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  preferences[key] ? 'bg-[#3f5ce8]' : 'bg-[#d8dae3]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    preferences[key] ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
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
