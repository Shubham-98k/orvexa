import React, { useState, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function MessagesView() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/conversations')
      .then((res) => {
        const convs = res?.conversations || [];
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConv(convs[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeConv?._id) {
      apiGet(`/conversations/${activeConv._id}/messages`)
        .then((res) => setMessages(res?.messages || []))
        .catch(() => setMessages([]));
    }
  }, [activeConv]);

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
      }
    } catch (err) {
      alert(err.message || 'Unable to send message.');
    }
  };

  const otherParticipant = activeConv?.participants?.find((p) => p._id !== user?.id) || {
    displayName: 'Orvexa Member',
    initials: 'OM',
    avatarColor: 'blue',
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#f0f0f2]">
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

      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] border border-[#e9e9ed] rounded-3xl overflow-hidden bg-white min-h-[500px] shadow-sm">
        {/* Left Inbox */}
        <div className="border-r border-[#e9e9ed] p-3 space-y-1 bg-[#fafafb]">
          <div className="text-[10px] font-extrabold uppercase text-[#9298a7] p-2">Conversations</div>
          {loading ? (
            <div className="p-4 text-center text-xs text-[#8b92a1]">Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#8b92a1] space-y-1">
              <MessageSquare className="w-5 h-5 mx-auto text-[#8b92a1] opacity-50" />
              <p>No conversations yet.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.participants?.find((p) => p._id !== user?.id) || {};
              const isSelected = activeConv?._id === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveConv(c)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-white shadow-2xs border border-[#e9e9ed]' : 'hover:bg-white/60'
                  }`}
                >
                  <Avatar initials={other.initials || 'OM'} color={other.avatarColor || 'blue'} size="w-8 h-8 text-[11px]" />
                  <div className="overflow-hidden text-left flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#17213f] truncate">{other.displayName}</div>
                    <div className="text-[10px] text-[#737b8d] truncate">{c.lastMessage || 'Started chat'}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Active Chat */}
        <div className="flex flex-col justify-between p-5 bg-white">
          {activeConv ? (
            <>
              <div className="border-b border-[#f0f0f2] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={otherParticipant.initials} color={otherParticipant.avatarColor} />
                  <div>
                    <div className="text-xs font-bold text-[#17213f]">{otherParticipant.displayName}</div>
                    <div className="text-[10px] text-[#5aa789] font-semibold">● Direct conversation</div>
                  </div>
                </div>
              </div>

              <div className="py-4 space-y-3 flex-1 overflow-y-auto max-h-[340px]">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8b92a1]">Say hello to start the discussion!</div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id || msg.senderName === user?.displayName;
                    return (
                      <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMine ? 'bg-[#3f5ce8] text-white rounded-br-xs' : 'bg-[#f0f1f4] text-[#17213f] rounded-bl-xs'
                          }`}
                        >
                          {msg.body}
                        </div>
                        <span className="text-[9px] text-[#9298a7] mt-0.5 px-1">
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-[#f0f0f2] pt-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message..."
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
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#8b92a1]">
              <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
              <span>Select a conversation to start messaging</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
