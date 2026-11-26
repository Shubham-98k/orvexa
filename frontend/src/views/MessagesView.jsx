import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, Plus, Search, X } from 'lucide-react';
import { io } from 'socket.io-client';
import Avatar from '../components/common/Avatar';
import { apiDelete, apiGet, apiPatch, apiPost, getAuthToken, getSocketUrl } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function MessagesView() {
  const { user } = useAuth();
  const { showToast } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeCircleInfoState, setActiveCircleInfoState] = useState({ circleId: null, circle: null });
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editWindowTime, setEditWindowTime] = useState(() => Date.now());

  // New message modal
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchState, setUserSearchState] = useState({ query: null, results: [] });
  const activeConversationId = activeConv?._id;
  const activeConversationIdRef = useRef(activeConversationId);
  const activeCircleId = (activeConv?.circleId?._id || activeConv?.circleId)?.toString();
  const activeCircleInfo = activeCircleInfoState.circleId === activeCircleId ? activeCircleInfoState.circle : null;

  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const preserveScrollRef = useRef(null);
  const socketErrorNotifiedRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const currentUserId = (user?._id || user?.id)?.toString();
  const userSearchResults = userSearchState.query === userSearchQuery ? userSearchState.results : [];
  const searchingUsers = newChatModalOpen && userSearchState.query !== userSearchQuery;

  const scrollToBottom = () => {
    const scrollPosition = preserveScrollRef.current;
    if (scrollPosition && messagesListRef.current) {
      const list = messagesListRef.current;
      list.scrollTop = scrollPosition.top + list.scrollHeight - scrollPosition.height;
      preserveScrollRef.current = null;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load of conversations
  useEffect(() => {
    let isMounted = true;
    apiGet('/conversations')
      .then(async (res) => {
        if (!isMounted) return;
        let convs = res?.conversations || [];
        setConversations(convs);

        // Check if navigated with state or URL params
        const stateConvId = location.state?.conversationId;
        const userParam = searchParams.get('user');
        const conversationParam = searchParams.get('conversation');

        if (stateConvId || conversationParam) {
          const targetId = stateConvId || conversationParam;
          let target = convs.find((c) => c._id === targetId);
          if (!target) {
            try {
              const response = await apiGet(`/conversations/${targetId}`);
              target = response.conversation;
              if (target) {
                convs = [target, ...convs];
                setConversations(convs);
              }
            } catch (error) {
              showToast(error.message || 'Unable to open this conversation.');
            }
          }
          if (target) {
            setActiveConv(target);
            return;
          }
        }

        if (userParam) {
          try {
            const startRes = await apiPost('/conversations', { recipientId: userParam });
            if (startRes?.conversation) {
              const existingIdx = convs.findIndex((c) => c._id === startRes.conversation._id);
              if (existingIdx === -1) {
                convs = [startRes.conversation, ...convs];
                setConversations(convs);
              }
              setActiveConv(startRes.conversation);
              return;
            }
          } catch (err) {
            console.warn('Failed to start conversation from query param:', err.message);
          }
        }

        if (convs.length > 0) {
          setActiveConv(convs[0]);
        }
      })
      .catch((error) => showToast(error.message || 'Unable to load conversations.'))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.state, searchParams, showToast]);

  // Load messages for selected conversation
  useEffect(() => {
    if (activeConversationId) {
      let active = true;
      apiGet(`/conversations/${activeConversationId}/messages`)
        .then((res) => {
          if (!active) return;
          setMessages(res?.messages || []);
          setHasMoreMessages(Boolean(res?.hasMore));
        })
        .catch((error) => {
          if (active) showToast(error.message || 'Unable to load messages.');
        });
      apiPost(`/conversations/${activeConversationId}/read`, {})
        .then(() => {
          if (active) setConversations((previous) => previous.map((conversation) =>
            conversation._id === activeConversationId ? { ...conversation, unreadCount: 0 } : conversation
          ));
        })
        .catch((error) => {
          if (active) showToast(error.message || 'Unable to mark messages as read.');
        });
      return () => { active = false; };
    }
    return undefined;
  }, [activeConversationId, showToast]);

  useEffect(() => {
    if (activeConv?.type !== 'direct') return undefined;
    const expirations = messages
      .filter((message) => (message.senderId?._id || message.senderId)?.toString() === currentUserId)
      .map((message) => new Date(message.createdAt).getTime() + 60_001)
      .filter((expiry) => expiry > Date.now());
    if (expirations.length === 0) return undefined;
    const timeout = setTimeout(
      () => setEditWindowTime(Date.now()),
      Math.min(...expirations) - Date.now()
    );
    return () => clearTimeout(timeout);
  }, [activeConv?.type, currentUserId, editWindowTime, messages]);

  const handleLoadOlderMessages = async () => {
    const cursor = messages[0]?._id;
    if (!activeConversationId || !cursor || loadingOlderMessages) return;
    const conversationId = activeConversationId;
    const list = messagesListRef.current;
    preserveScrollRef.current = list ? { height: list.scrollHeight, top: list.scrollTop } : null;
    setLoadingOlderMessages(true);
    try {
      const response = await apiGet(`/conversations/${conversationId}/messages?before=${encodeURIComponent(cursor)}`);
      if (activeConversationIdRef.current !== conversationId) return;
      setMessages((previous) => [...(response.messages || []), ...previous]);
      setHasMoreMessages(Boolean(response.hasMore));
    } catch (error) {
      preserveScrollRef.current = null;
      showToast(error.message || 'Unable to load older messages.');
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  useEffect(() => {
    if (activeConv?.type !== 'circle_group' || !activeCircleId) {
      return undefined;
    }
    let active = true;
    apiGet(`/circles/${activeCircleId}`)
      .then((response) => {
        if (active) setActiveCircleInfoState({ circleId: activeCircleId, circle: response.circle });
      })
      .catch((error) => {
        if (active) showToast(error.message || 'Unable to load Circle chat information.');
      });
    return () => { active = false; };
  }, [activeCircleId, activeConv?.type, showToast]);

  useEffect(() => {
    if (!activeConversationId) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;
    const socket = io(getSocketUrl(), { auth: { token } });
    const conversationId = activeConversationId;
    const joinRoom = () => socket.emit('join_conversation', conversationId);
    const appendMessage = (message) => {
      if (message.conversationId?.toString() !== conversationId) return;
      setMessages((previous) => previous.some((item) => item._id === message._id) ? previous : [...previous, message]);
      setConversations((previous) => previous.map((conversation) =>
        conversation._id === conversationId
          ? { ...conversation, lastMessage: message.body, lastMessageAt: message.createdAt }
          : conversation
      ));
    };
    socket.on('connect', () => {
      socketErrorNotifiedRef.current = false;
      joinRoom();
    });
    socket.on('new_message', appendMessage);
    socket.on('message_updated', (message) => {
      if (message.conversationId?.toString() !== conversationId) return;
      setMessages((previous) => previous.map((item) => item._id === message._id ? message : item));
    });
    socket.on('message_removed', (message) => {
      if (message.conversationId?.toString() !== conversationId) return;
      setMessages((previous) => previous.filter((item) => item._id !== message._id));
    });
    socket.on('conversation_updated', (update) => {
      if (update.conversationId?.toString() !== conversationId) return;
      setConversations((previous) => previous.map((conversation) =>
        conversation._id === conversationId
          ? { ...conversation, lastMessage: update.lastMessage, lastMessageAt: update.lastMessageAt }
          : conversation
      ));
    });
    socket.on('circle_membership_removed', (event) => {
      if (activeConv?.type !== 'circle_group' || event.circleId !== activeCircleId) return;
      setMessages([]);
      setActiveConv(null);
      setConversations((previous) => previous.filter((conversation) => conversation._id !== conversationId));
      showToast('You no longer have access to that Circle chat.');
    });
    socket.on('operation_error', (payload) => showToast(payload?.error || 'Conversation action failed.'));
    socket.on('connect_error', (error) => {
      console.warn('Real-time messaging connection failed:', error.message);
      if (socketErrorNotifiedRef.current) return;
      socketErrorNotifiedRef.current = true;
      showToast('Live updates are unavailable. Messages can still be sent; reconnecting automatically.');
    });
    if (socket.connected) joinRoom();
    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [activeCircleId, activeConversationId, activeConv?.type, showToast]);

  // Search users for new chat modal
  useEffect(() => {
    if (newChatModalOpen) {
      apiGet(`/users?limit=10${userSearchQuery ? `&q=${encodeURIComponent(userSearchQuery)}` : ''}`)
        .then((res) => {
          const eligible = (res?.users || []).filter(
            (u) => (u._id || u.id)?.toString() !== currentUserId
          );
          setUserSearchState({ query: userSearchQuery, results: eligible });
        })
        .catch((error) => {
          setUserSearchState({ query: userSearchQuery, results: [] });
          showToast(error.message || 'Unable to search for members.');
        });
    }
  }, [newChatModalOpen, userSearchQuery, currentUserId, showToast]);

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await apiPost('/conversations', { recipientId: targetUser._id || targetUser.id });
      if (res?.conversation) {
        const existingIdx = conversations.findIndex((c) => c._id === res.conversation._id);
        if (existingIdx === -1) {
          setConversations([res.conversation, ...conversations]);
        }
        setActiveConv(res.conversation);
        setNewChatModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Unable to start chat');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConv) return;

    try {
      const res = await apiPost(`/conversations/${activeConv._id}/messages`, {
        body: chatInput.trim(),
      });
      if (res?.message) {
        setMessages((prev) => prev.some((item) => item._id === res.message._id) ? prev : [...prev, res.message]);
        setChatInput('');
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConv._id
              ? { ...c, lastMessage: res.message.body, lastMessageAt: new Date() }
              : c
          )
        );
      }
    } catch (err) {
      alert(err.message || 'Unable to send message.');
    }
  };

  const handleEditMessage = async (message) => {
    const body = window.prompt('Edit message', message.body);
    if (body === null || !body.trim()) return;
    try {
      const response = await apiPatch(`/conversations/${activeConv._id}/messages/${message._id}`, { body });
      setMessages((previous) => previous.map((item) => item._id === message._id ? response.message : item));
    } catch (error) {
      showToast(error.message || 'Unable to edit message.');
    }
  };

  const handleDeleteMessage = async (message, moderate = false) => {
    const reason = moderate ? window.prompt('Reason for removing this message?') : '';
    if (moderate && !reason?.trim()) return;
    if (!moderate && !window.confirm('Delete this message for everyone in the conversation?')) return;
    try {
      await apiDelete(`/conversations/${activeConv._id}/messages/${message._id}`, moderate ? { reason } : undefined);
      setMessages((previous) => previous.filter((item) => item._id !== message._id));
    } catch (error) {
      showToast(error.message || 'Unable to delete message.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeCircleId || !window.confirm('Leave this Circle and lose access to its group chat?')) return;
    try {
      await apiPost(`/circles/${activeCircleId}/leave`, {});
      setConversations((previous) => previous.filter((item) => item._id !== activeConversationId));
      setMessages([]);
      setActiveConv(null);
      navigate('/circles');
      showToast('You left the Circle.');
    } catch (error) {
      showToast(error.message || 'Unable to leave this Circle.');
    }
  };

  const handleReportMessage = async (message) => {
    const reason = window.prompt('Why are you reporting this message?');
    if (!reason?.trim() || activeConv.type !== 'circle_group') return;
    try {
      await apiPost(`/circles/${activeConv.circleId._id}/reports`, {
        targetType: 'message',
        targetId: message._id,
        reason: reason.trim(),
      });
      showToast('Message reported to Circle moderators.');
    } catch (error) {
      showToast(error.message || 'Unable to report message.');
    }
  };

  const handleMuteConversation = async () => {
    if (!activeConv) return;
    const action = activeConv.isMuted ? 'unmute' : 'mute';
    try {
      const response = await apiPost(`/conversations/${activeConv._id}/${action}`, {});
      setActiveConv((previous) => ({ ...previous, isMuted: response.muted }));
      setConversations((previous) => previous.map((item) =>
        item._id === activeConv._id ? { ...item, isMuted: response.muted } : item
      ));
      showToast(response.muted ? 'Conversation muted.' : 'Conversation unmuted.');
    } catch (error) {
      showToast(error.message || 'Unable to update mute settings.');
    }
  };

  const otherParticipant = activeConv?.participants?.find(
    (p) => (p._id || p.id)?.toString() !== currentUserId
  ) || {
    displayName: 'Orvexa Member',
    initials: 'OM',
    avatarColor: 'blue',
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#f0f0f2] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            PRIVATE COMMUNICATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] dark:text-white leading-tight">
            Messages
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] dark:text-slate-400 mt-1">
            Private conversations and Circle group chats in one inbox.
          </p>
        </div>

        <button
          onClick={() => setNewChatModalOpen(true)}
          className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] border border-[#e9e9ed] dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 min-h-[520px] shadow-sm">
        {/* Left Inbox */}
        <div className="border-r border-[#e9e9ed] dark:border-slate-800 p-3 space-y-1 bg-[#fafafb] dark:bg-slate-950/50 flex flex-col">
          <div className="flex items-center justify-between p-2">
            <span className="text-[10px] font-extrabold uppercase text-[#9298a7] dark:text-slate-500">Conversations</span>
            <button
              onClick={() => setNewChatModalOpen(true)}
              title="Start a new message"
              className="text-xs text-[#3f5ce8] dark:text-blue-400 hover:underline font-bold"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="p-4 text-center text-xs text-[#8b92a1] dark:text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8b92a1] dark:text-slate-400 space-y-2">
                <MessageSquare className="w-6 h-6 mx-auto text-[#8b92a1] dark:text-slate-500 opacity-50" />
                <p className="font-semibold text-[#17213f] dark:text-white">No conversations yet</p>
                <p>Send a direct message from someone's profile to start chatting.</p>
                <button
                  onClick={() => setNewChatModalOpen(true)}
                  className="mt-2 text-xs font-bold text-[#3f5ce8] dark:text-blue-400 hover:underline"
                >
                  Start a conversation →
                </button>
              </div>
            ) : (
              conversations.map((c) => {
                const isGroup = c.type === 'circle_group';
                const other = c.participants?.find((p) => (p._id || p.id)?.toString() !== currentUserId) || {};
                const title = isGroup ? c.circleId?.name || 'Circle conversation' : other.displayName || 'Orvexa Member';
                const isSelected = activeConv?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveConv(c)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-white dark:bg-slate-800 shadow-2xs border border-[#e9e9ed] dark:border-slate-700' : 'hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Avatar
                      initials={isGroup ? 'C' : other.initials || 'OM'}
                      color={isGroup ? 'violet' : other.avatarColor || 'blue'}
                      src={isGroup ? c.circleId?.avatar : other.avatar}
                      size="w-8 h-8 text-[11px]"
                    />
                    <div className="overflow-hidden text-left flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#17213f] dark:text-white truncate">{title}</div>
                      <div className="text-[10px] text-[#737b8d] dark:text-slate-400 truncate">{isGroup ? 'Circle group' : 'Direct message'} · {c.lastMessage || 'Started chat'}</div>
                    </div>
                    {c.unreadCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{c.unreadCount}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat */}
        <div className="flex flex-col justify-between p-5 bg-white dark:bg-slate-900 min-h-[400px]">
          {activeConv ? (
            <>
              {(() => {
                const isGroup = activeConv.type === 'circle_group';
                const chatTitle = isGroup ? activeConv.circleId?.name || 'Circle group' : otherParticipant.displayName;
                return (
              <div className="border-b border-[#f0f0f2] dark:border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    initials={isGroup ? 'C' : otherParticipant.initials}
                    color={isGroup ? 'violet' : otherParticipant.avatarColor}
                    src={isGroup ? activeConv.circleId?.avatar : otherParticipant.avatar}
                    size="w-9 h-9 text-xs"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#17213f] dark:text-white">{chatTitle}</div>
                    <div className="text-[10px] text-[#5aa789] font-semibold">● {isGroup ? 'Circle group conversation' : 'Direct conversation'}</div>
                    {isGroup && activeCircleInfo && <Link to={`/circles/${activeCircleInfo.slug || activeCircleInfo._id}`} className="mt-1 inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{activeCircleInfo.membersCount || 0} members · View Circle</Link>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleMuteConversation} className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">
                    {activeConv.isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  {isGroup && <button onClick={handleLeaveGroup} className="text-[10px] font-bold text-red-500">Leave</button>}
                </div>
              </div>
                );
              })()}

              <div ref={messagesListRef} className="py-4 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
                {hasMoreMessages && <div className="text-center"><button onClick={handleLoadOlderMessages} disabled={loadingOlderMessages} className="text-[10px] font-bold text-indigo-600 disabled:opacity-50 dark:text-indigo-400">{loadingOlderMessages ? 'Loading…' : 'Load older messages'}</button></div>}
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8b92a1] dark:text-slate-400">
                    Say hello to start the discussion!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = (msg.senderId?._id || msg.senderId)?.toString() === currentUserId;
                    const messageAge = editWindowTime - new Date(msg.createdAt).getTime();
                    const canEdit = isMine && (
                      activeConv.type !== 'direct' ||
                      (messageAge >= 0 && messageAge <= 60_000)
                    );
                    return (
                      <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {activeConv.type === 'circle_group' && !isMine && <span className="mb-1 px-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">{msg.senderId?.displayName || msg.senderName || 'Circle member'}</span>}
                        <div
                          className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-[#3f5ce8] text-white rounded-br-xs'
                              : 'bg-[#f0f1f4] dark:bg-slate-800 text-[#17213f] dark:text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          {msg.moderationStatus === 'removed' ? 'Message removed' : msg.body}
                        </div>
                        {canEdit && (
                          <div className="mt-1 flex gap-2 px-1">
                            <button onClick={() => handleEditMessage(msg)} className="text-[9px] font-semibold text-slate-400 hover:text-indigo-500">Edit</button>
                          </div>
                        )}
                        {isMine && (
                          <div className="mt-1 flex gap-2 px-1">
                            <button onClick={() => handleDeleteMessage(msg)} className="text-[9px] font-semibold text-slate-400 hover:text-red-500">Delete</button>
                          </div>
                        )}
                        {!isMine && activeConv.type === 'circle_group' && ['owner', 'admin', 'moderator'].includes(activeCircleInfo?.role) && (
                          <button onClick={() => handleDeleteMessage(msg, true)} className="mt-1 px-1 text-[9px] font-semibold text-red-500">Moderate: remove</button>
                        )}
                        {!isMine && activeConv.type === 'circle_group' && (
                          <button onClick={() => handleReportMessage(msg)} className="mt-1 px-1 text-[9px] font-semibold text-slate-400 hover:text-red-500">Report</button>
                        )}
                        <span className="text-[9px] text-[#9298a7] dark:text-slate-500 mt-0.5 px-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : ''}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-[#f0f0f2] dark:border-slate-800 pt-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  maxLength={5000}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${activeConv.type === 'circle_group' ? activeConv.circleId?.name || 'Circle' : otherParticipant.displayName}...`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#17213f] dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-[#3f5ce8]"
                />
                <button
                  type="submit"
                  className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white p-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#8b92a1] dark:text-slate-400 space-y-2">
              <MessageSquare className="w-9 h-9 opacity-40 mb-1" />
              <span className="font-semibold text-[#17213f] dark:text-white">Select a conversation to start messaging</span>
              <p className="text-[11px] text-[#8b92a1] dark:text-slate-400">Or click "New Chat" to message any community member.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setNewChatModalOpen(false)}
          className="fixed inset-0 bg-[#17213f]/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2] dark:border-slate-800">
              <h3 className="text-base font-bold text-[#17213f] dark:text-white">New Direct Message</h3>
              <button
                onClick={() => setNewChatModalOpen(false)}
                className="text-[#8b92a1] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#8b92a1] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search member by name or username..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#17213f] dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-[#f0f0f4] dark:divide-slate-800">
              {searchingUsers ? (
                <div className="py-6 text-center text-xs text-[#8b92a1] dark:text-slate-400">Searching members...</div>
              ) : userSearchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8b92a1] dark:text-slate-400">No members found</div>
              ) : (
                userSearchResults.map((m) => (
                  <div
                    key={m._id || m.id}
                    onClick={() => handleStartChatWithUser(m)}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={m.initials || 'OM'} color={m.avatarColor || 'blue'} src={m.avatar} size="w-8 h-8 text-[11px]" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#17213f] dark:text-white truncate">{m.displayName}</div>
                        <div className="text-[10px] text-[#737b8d] dark:text-slate-400 truncate">@{m.username}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#3f5ce8] dark:text-blue-400">Chat →</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
