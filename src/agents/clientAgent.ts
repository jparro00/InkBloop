import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import { useClientStore } from '../stores/clientStore';
import type { ResolvedClientCreate, ResolvedClientOpen, ResolvedClientEdit, ResolvedClientDelete } from './types';

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

export async function executeClientDelete(data: ResolvedClientDelete) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();
  const clientStore = useClientStore.getState();

  const client = clientStore.clients.find((c) => c.id === data.client_id);
  const clientName = client?.name ?? 'client';

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: `Deleting ${clientName}...`,
  });

  try {
    await clientStore.deleteClient(data.client_id);
    ui.addToast(`Deleted ${clientName}`);
    setTimeout(() => store.closePanel(), 300);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.replaceLastLoading({ text: `Failed to delete ${clientName}: ${msg}` });
  }
}

export function executeClientEdit(data: ResolvedClientEdit) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  // Filter to only defined changes
  const definedChanges: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data.changes)) {
    if (v !== undefined) definedChanges[k] = v;
  }

  // Store which fields are being changed and their values
  ui.setChangedClientFields(new Set(Object.keys(definedChanges)));
  ui.setPendingClientChanges(data.changes);

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening client for editing...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setEditingClientId(data.client_id);
  }, 300);
}
