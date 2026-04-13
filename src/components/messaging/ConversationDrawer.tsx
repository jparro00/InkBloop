import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../common/Modal';
import { useUIStore } from '../../stores/uiStore';
import { useMessageStore, isBusinessMessage } from '../../stores/messageStore';
import type { GraphMessage } from '../../services/messageService';

function MessageBubble({ msg }: { msg: GraphMessage }) {
  const isBusiness = isBusinessMessage(msg) || msg.from.id === '__self__';
  const isPending = msg.id.startsWith('pending_');
  const hasAttachments = msg.attachments?.data?.length;

  return (
    <div className={`flex ${isBusiness ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className="max-w-[80%]">
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isBusiness
              ? 'bg-accent/15 text-text-p rounded-br-md'
              : 'bg-surface border border-border/30 text-text-p rounded-bl-md'
          } ${isPending ? 'opacity-60' : ''}`}
        >
          {msg.message && <div>{msg.message}</div>}
          {hasAttachments && msg.attachments!.data.map((att, i) => (
            att.payload?.url ? (
              <img
                key={i}
                src={att.payload.url}
                alt="attachment"
                className="mt-1 rounded-lg max-w-full max-h-48 object-cover"
              />
            ) : (
              <div key={i} className="text-text-t text-xs mt-1">[{att.type}]</div>
            )
          ))}
        </div>
        <div className={`text-[11px] text-text-t mt-1 ${isBusiness ? 'text-right' : 'text-left'} px-1`}>
          {format(new Date(msg.created_time), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

export default function ConversationDrawer() {
  const { selectedConversationId, setSelectedConversationId } = useUIStore();
  const conversations = useMessageStore((s) => s.conversations);
  const currentMessages = useMessageStore((s) => s.currentMessages);
  const fetchMessages = useMessageStore((s) => s.fetchMessages);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const markRead = useMessageStore((s) => s.markRead);
  const clearCurrentMessages = useMessageStore((s) => s.clearCurrentMessages);
  const isSending = useMessageStore((s) => s.isSending);

  const convo = conversations.find((c) => c.id === selectedConversationId);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  // Fetch messages on open + poll
  useEffect(() => {
    if (!selectedConversationId) return;

    fetchMessages(selectedConversationId);
    markRead(selectedConversationId);

    const interval = setInterval(() => {
      fetchMessages(selectedConversationId);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearCurrentMessages();
    };
  }, [selectedConversationId, fetchMessages, markRead, clearCurrentMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentMessages.length > prevMsgCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMsgCount.current = currentMessages.length;
  }, [currentMessages.length]);

  if (!convo) return null;

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    try {
      await sendMessage(convo.id, convo.platform, convo.participantPsid, msg);
    } catch (e) {
      console.error('Failed to send:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Modal
      title={convo.participantName}
      onClose={() => setSelectedConversationId(null)}
      fullScreenMobile={true}
    >
      <div className="flex flex-col h-full -mx-5 -my-5 lg:-mx-6 lg:-my-5">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 lg:px-5"
          style={{ minHeight: 0 }}
        >
          {currentMessages.length === 0 ? (
            <div className="text-center text-text-t text-sm py-12">No messages yet</div>
          ) : (
            currentMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border/40 px-4 py-3 lg:px-5 flex items-end gap-3 bg-elevated">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-surface border border-border/40 rounded-xl px-4 py-3 text-sm text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 resize-none transition-colors max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center cursor-pointer press-scale transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
