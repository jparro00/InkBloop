import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import type { ResolvedClientCreate, ResolvedClientOpen, ResolvedClientEdit } from './types';

/**
 * Client Agent — pure executor.
 * Receives fully resolved entities from the orchestrator.
 */

export function executeClientCreate(data: ResolvedClientCreate) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  // Store prefill data for CreateClientForm
  if (data.name || data.phone) {
    ui.setPrefillClientData({ name: data.name, phone: data.phone });
  }

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening new client form...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setCreateClientFormOpen(true);
  }, 300);
}

export function executeClientOpen(data: ResolvedClientOpen) {
  const store = useAgentStore.getState();

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening client profile...',
  });

  setTimeout(() => {
    store.closePanel();
    // Navigate — we import navigate at call time to avoid hook issues
    window.dispatchEvent(
      new CustomEvent('agent-navigate', { detail: `/clients/${data.client_id}` })
    );
  }, 300);
}

export function executeClientEdit(data: ResolvedClientEdit) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  // Store which fields are being changed by the agent
  ui.setChangedClientFields(new Set(Object.keys(data.changes)));

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening client for editing...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setEditingClientId(data.client_id);
  }, 300);
}
