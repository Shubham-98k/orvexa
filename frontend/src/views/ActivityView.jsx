import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPatch, apiPost } from '../api/client';

export default function ActivityView() {
  const { showToast } = useOutletContext?.() || { showToast: () => {} };
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
    let active = true;
    const loadNotifications = async () => {
      try {
        const [notificationsRes, preferencesRes] = await Promise.all([
          apiGet('/notifications'),
          apiGet('/notifications/preferences'),
        ]);
        let nextNotifications = notificationsRes?.notifications || [];
        if (notificationsRes?.unreadCount > 0) {
          await apiPost('/notifications/read-all', {});
          nextNotifications = nextNotifications.map((notification) => ({
            ...notification,
            isRead: true,
          }));
        }
        if (!active) return;
        setNotifications(nextNotifications);
        setPreferences(preferencesRes?.preferences || {
          replies: true,
          likes: true,
          follows: true,
          mentions: true,
        });
      } catch (err) {
        if (active) {
          showToast?.(err.message || 'Unable to load notifications');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  const updatePreference = async (key) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);
    setSavingPreferences(true);
    try {
      const res = await apiPatch('/notifications/preferences', nextPreferences);
      setPreferences(res.preferences);
      showToast?.(`${key === 'replies' ? 'Reply' : key[0].toUpperCase() + key.slice(1)} notifications ${nextPreferences[key] ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setPreferences(preferences);
      showToast?.(err.message || 'Unable to update notification settings');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPost('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast?.('All notifications marked as read');
    } catch (err) {
      showToast?.(err.message || 'Unable to mark notifications as read');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2] dark:border-slate-800">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            NOTIFICATIONS CENTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17213f] dark:text-white leading-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] dark:text-slate-400 mt-1">
            Stay up to date with conversations, replies, mentions, and community notices.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-[#3f5ce8] dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="border border-[#e9e9ed] dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Notification preferences</h2>
          <p className="text-xs text-[#737b8d] dark:text-slate-400 mt-0.5">Customize what you receive updates for.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['replies', 'Replies and contributions'],
            ['likes', 'Likes and upvotes'],
            ['follows', 'New followers'],
            ['mentions', 'Mentions and staff notes'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={savingPreferences}
              onClick={() => updatePreference(key)}
              className="flex items-center justify-between rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3.5 py-3 text-xs font-semibold text-[#38425b] dark:text-slate-300 hover:bg-[#fafafb] dark:hover:bg-slate-800 cursor-pointer"
            >
              <span>{label}</span>
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  preferences[key] ? 'bg-[#3f5ce8]' : 'bg-[#d8dae3] dark:bg-slate-600'
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
        <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] dark:border-slate-800 rounded-3xl space-y-2 bg-white dark:bg-slate-900">
          <Bell className="w-8 h-8 text-[#8b92a1] mx-auto opacity-50" />
          <p className="font-semibold text-[#17213f] dark:text-white">No new notifications right now.</p>
          <p>When someone mentions you, upvotes your discussion, or replies, it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const isModeration = n.type === 'content_deleted' || n.type === 'moderation';
            return (
              <div
                key={n._id}
                className={`border rounded-2xl p-4 flex items-start gap-3.5 transition-colors ${
                  isModeration
                    ? 'border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20'
                    : n.isRead
                    ? 'border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900'
                    : 'border-[#3f5ce8]/20 bg-[#f7f9ff] dark:bg-blue-950/20'
                }`}
              >
                {isModeration ? (
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : (
                  <Avatar
                    initials={n.actorInitials || 'OP'}
                    color={n.actorColor || 'purple'}
                    size="w-8 h-8 text-xs"
                  />
                )}
                <div className="flex-1 text-xs leading-relaxed text-[#38425b] dark:text-slate-300">
                  <div className="font-bold text-[#17213f] dark:text-white">
                    {n.title || `${n.actorName} interacted with your content`}
                  </div>
                  {(n.message || n.reason) && (
                    <div className="mt-1 text-xs text-red-700 dark:text-red-300 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-red-200 dark:border-red-900/40">
                      Reason: {n.message || n.reason}
                    </div>
                  )}
                  <div className="text-[10px] text-[#9298a7] dark:text-slate-500 mt-1">
                    {n.timeText || new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
