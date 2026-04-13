import { create } from 'zustand';
import { fetchAllConversations } from '../services/messageService';
import type { ConversationSummary } from '../services/messageService';

interface MessageStore {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  markRead: (conversationId: string) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
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
        c.id === conversationId ? { ...c, lastMessageFromClient: false } : c
      ),
    }));
  },
}));
