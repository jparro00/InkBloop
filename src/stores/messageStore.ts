import { create } from 'zustand';
import {
  fetchAllConversations,
  fetchConversationMessages,
  sendMessage as sendMessageApi,
  isBusinessMessage,
} from '../services/messageService';
import type { ConversationSummary, GraphMessage } from '../services/messageService';

interface MessageStore {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  markRead: (conversationId: string) => void;

  // Chat detail state
  currentMessages: GraphMessage[];
  currentConversationId: string | null;
  isSending: boolean;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, platform: 'instagram' | 'messenger', recipientPsid: string, text: string) => Promise<void>;
  clearCurrentMessages: () => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  conversations: [],
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await fetchAllConversations();
      set({ conversations, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  markRead: (conversationId) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessageFromClient: false, unreadCount: 0 } : c
      ),
    }));
  },

  // Chat detail
  currentMessages: [],
  currentConversationId: null,
  isSending: false,

  fetchMessages: async (conversationId) => {
    try {
      const messages = await fetchConversationMessages(conversationId);
      // Only update if still viewing this conversation
      if (get().currentConversationId === conversationId || !get().currentConversationId) {
        set({ currentMessages: messages, currentConversationId: conversationId });
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  },

  sendMessage: async (conversationId, platform, recipientPsid, text) => {
    // Optimistic: add message immediately
    const optimistic: GraphMessage = {
      id: 'pending_' + Date.now(),
      created_time: new Date().toISOString(),
      from: { id: '__self__', name: 'Ink Bloop' },
      to: { data: [{ id: recipientPsid, name: '' }] },
      message: text,
    };
    set((s) => ({ currentMessages: [...s.currentMessages, optimistic], isSending: true }));

    try {
      const result = await sendMessageApi(platform, recipientPsid, text);
      // Replace optimistic with real message id
      set((s) => ({
        currentMessages: s.currentMessages.map((m) =>
          m.id === optimistic.id ? { ...m, id: result.messageId } : m
        ),
        isSending: false,
      }));
      // Also update the conversation list snippet
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: text, lastMessageTime: new Date().toISOString(), lastMessageFromClient: false, unreadCount: 0 }
            : c
        ),
      }));
    } catch (e) {
      // Remove optimistic on failure
      set((s) => ({
        currentMessages: s.currentMessages.filter((m) => m.id !== optimistic.id),
        isSending: false,
      }));
      throw e;
    }
  },

  clearCurrentMessages: () => set({ currentMessages: [], currentConversationId: null }),
}));

export { isBusinessMessage };
