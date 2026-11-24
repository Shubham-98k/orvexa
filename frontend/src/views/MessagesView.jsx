import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, Plus, Search, X } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function MessagesView() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);

  // New message modal
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const messagesEndRef = useRef(null);
  const currentUserId = (user?._id || user?.id)?.toString();

  const scrollToBottom = () => {
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

        if (stateConvId) {
          const target = convs.find((c) => c._id === stateConvId);
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

        if (convs.length > 0 && !activeConv) {
          setActiveConv(convs[0]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.state, searchParams]);

  // Load messages for selected conversation
  useEffect(() => {
    if (activeConv?._id) {
      apiGet(`/conversations/${activeConv._id}/messages`)
        .then((res) => setMessages(res?.messages || []))
        .catch(() => setMessages([]));
    }
  }, [activeConv]);

  // Search users for new chat modal
  useEffect(() => {
    if (newChatModalOpen) {
      setSearchingUsers(true);
      apiGet(`/users?limit=10${userSearchQuery ? `&q=${encodeURIComponent(userSearchQuery)}` : ''}`)
        .then((res) => {
          const eligible = (res?.users || []).filter(
            (u) => (u._id || u.id)?.toString() !== currentUserId
          );
          setUserSearchResults(eligible);
        })
        .catch(() => setUserSearchResults([]))
        .finally(() => setSearchingUsers(false));
    }
  }, [newChatModalOpen, userSearchQuery, currentUserId]);

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
        setMessages((prev) => [...prev, res.message]);
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

  const otherParticipant = activeConv?.participants?.find(
    (p) => (p._id || p.id)?.toString() !== currentUserId
  ) || {
    displayName: 'Orvexa Member',
    initials: 'OM',
    avatarColor: 'blue',
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#f0f0f2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            PRIVATE COMMUNICATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
            Direct Messages
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Authenticated one-to-one discussions with people in the community.
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

      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] border border-[#e9e9ed] rounded-3xl overflow-hidden bg-white min-h-[520px] shadow-sm">
        {/* Left Inbox */}
        <div className="border-r border-[#e9e9ed] p-3 space-y-1 bg-[#fafafb] flex flex-col">
          <div className="flex items-center justify-between p-2">
            <span className="text-[10px] font-extrabold uppercase text-[#9298a7]">Conversations</span>
            <button
              onClick={() => setNewChatModalOpen(true)}
              title="Start a new message"
              className="text-xs text-[#3f5ce8] hover:underline font-bold"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="p-4 text-center text-xs text-[#8b92a1]">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8b92a1] space-y-2">
                <MessageSquare className="w-6 h-6 mx-auto text-[#8b92a1] opacity-50" />
                <p className="font-semibold text-[#17213f]">No conversations yet</p>
                <p>Send a direct message from someone's profile to start chatting.</p>
                <button
                  onClick={() => setNewChatModalOpen(true)}
                  className="mt-2 text-xs font-bold text-[#3f5ce8] hover:underline"
                >
                  Start a conversation →
                </button>
              </div>
            ) : (
              conversations.map((c) => {
                const other = c.participants?.find((p) => (p._id || p.id)?.toString() !== currentUserId) || {};
                const isSelected = activeConv?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveConv(c)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-white shadow-2xs border border-[#e9e9ed]' : 'hover:bg-white/60'
                    }`}
                  >
                    <Avatar
                      initials={other.initials || 'OM'}
                      color={other.avatarColor || 'blue'}
                      src={other.avatar}
                      size="w-8 h-8 text-[11px]"
                    />
                    <div className="overflow-hidden text-left flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#17213f] truncate">{other.displayName}</div>
                      <div className="text-[10px] text-[#737b8d] truncate">{c.lastMessage || 'Started chat'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat */}
        <div className="flex flex-col justify-between p-5 bg-white min-h-[400px]">
          {activeConv ? (
            <>
              <div className="border-b border-[#f0f0f2] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    initials={otherParticipant.initials}
                    color={otherParticipant.avatarColor}
                    src={otherParticipant.avatar}
                    size="w-9 h-9 text-xs"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#17213f]">{otherParticipant.displayName}</div>
                    <div className="text-[10px] text-[#5aa789] font-semibold">● Direct conversation</div>
                  </div>
                </div>
              </div>

              <div className="py-4 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8b92a1]">
                    Say hello to start the discussion!
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine =
                      (msg.senderId?._id || msg.senderId)?.toString() === currentUserId ||
                      msg.senderName === user?.displayName;
                    return (
                      <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-[#3f5ce8] text-white rounded-br-xs'
                              : 'bg-[#f0f1f4] text-[#17213f] rounded-bl-xs'
                          }`}
                        >
                          {msg.body}
                        </div>
                        <span className="text-[9px] text-[#9298a7] mt-0.5 px-1">
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-[#f0f0f2] pt-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${otherParticipant.displayName}...`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#3f5ce8]"
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
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#8b92a1] space-y-2">
              <MessageSquare className="w-9 h-9 opacity-40 mb-1" />
              <span className="font-semibold text-[#17213f]">Select a conversation to start messaging</span>
              <p className="text-[11px] text-[#8b92a1]">Or click "New Chat" to message any community member.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setNewChatModalOpen(false)}
          className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#e9e9ed] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2]">
              <h3 className="text-base font-bold text-[#17213f]">New Direct Message</h3>
              <button
                onClick={() => setNewChatModalOpen(false)}
                className="text-[#8b92a1] hover:text-[#17213f] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#8b92a1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search member by name or username..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-[#f0f0f4]">
              {searchingUsers ? (
                <div className="py-6 text-center text-xs text-[#8b92a1]">Searching members...</div>
              ) : userSearchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8b92a1]">No members found</div>
              ) : (
                userSearchResults.map((m) => (
                  <div
                    key={m._id || m.id}
                    onClick={() => handleStartChatWithUser(m)}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#f7f7f8] rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={m.initials || 'OM'} color={m.avatarColor || 'blue'} src={m.avatar} size="w-8 h-8 text-[11px]" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#17213f] truncate">{m.displayName}</div>
                        <div className="text-[10px] text-[#737b8d] truncate">@{m.username}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#3f5ce8]">Chat →</span>
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
