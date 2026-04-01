import { create } from 'zustand';
import type { Client, ClientNote } from '../types';
import { mockClients } from '../data/mockData';

interface ClientStore {
  clients: Client[];
  getClient: (id: string) => Client | undefined;
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'notes'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addNote: (clientId: string, text: string) => void;
  searchClients: (query: string) => Client[];
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: mockClients,

  getClient: (id) => get().clients.find((c) => c.id === id),

  addClient: (data) => {
    const client: Client = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      notes: [],
    };
    set((s) => ({ clients: [...s.clients, client] }));
    return client;
  },

  updateClient: (id, data) => {
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  },

  deleteClient: (id) => {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  },

  addNote: (clientId, text) => {
    const note: ClientNote = { ts: new Date().toISOString(), text };
    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === clientId ? { ...c, notes: [note, ...c.notes] } : c
      ),
    }));
  },

  searchClients: (query) => {
    const q = query.toLowerCase();
    return get().clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.instagram?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
