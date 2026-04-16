import { create } from 'zustand';
import type { AgentIntent, AgentMessage } from '../agents/types';

interface AgentStore {
  messages: AgentMessage[];
  isProcessing: boolean;
  panelOpen: boolean;

  // Stashed intent for resuming after user makes a selection
  pendingIntent: AgentIntent | null;
  // Resolved entities accumulated so far (e.g. after client selection)
  pendingResolved: Record<string, unknown>;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  addUserMessage: (text: string) => void;
  addAgentMessage: (message: Omit<AgentMessage, 'id' | 'role'>) => void;
  setLoading: (loading: boolean) => void;
  replaceLastLoading: (message: Omit<AgentMessage, 'id' | 'role'>) => void;
  setPending: (intent: AgentIntent | null, resolved?: Record<string, unknown>) => void;
  updatePendingResolved: (key: string, value: unknown) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  messages: [],
  isProcessing: false,
  panelOpen: false,
  pendingIntent: null,
  pendingResolved: {},

  openPanel: () => set({ panelOpen: true, messages: [], pendingIntent: null, pendingResolved: {}, isProcessing: false }),

  closePanel: () => set({ panelOpen: false }),

  addUserMessage: (text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: 'user' as const, text },
      ],
    })),

  addAgentMessage: (message) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: 'agent' as const, ...message },
      ],
    })),

  setLoading: (loading) => {
    if (loading) {
      // Add a loading message
      set((s) => ({
        isProcessing: true,
        messages: [
          ...s.messages,
          { id: crypto.randomUUID(), role: 'agent' as const, status: 'loading' as const },
        ],
      }));
    } else {
      set({ isProcessing: false });
    }
  },

  replaceLastLoading: (message) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastLoadingIdx = msgs.findLastIndex((m) => m.status === 'loading');
      if (lastLoadingIdx >= 0) {
        msgs[lastLoadingIdx] = { id: msgs[lastLoadingIdx].id, role: 'agent', ...message };
      } else {
        msgs.push({ id: crypto.randomUUID(), role: 'agent', ...message });
      }
      return { messages: msgs, isProcessing: false };
    }),

  setPending: (intent, resolved = {}) =>
    set({ pendingIntent: intent, pendingResolved: resolved }),

  updatePendingResolved: (key, value) =>
    set((s) => ({
      pendingResolved: { ...s.pendingResolved, [key]: value },
    })),

  reset: () =>
    set({
      messages: [],
      isProcessing: false,
      pendingIntent: null,
      pendingResolved: {},
    }),
}));
