import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import type { ResolvedBookingCreate, ResolvedBookingOpen, ResolvedBookingEdit } from './types';

/**
 * Booking Agent — pure executor.
 * Receives fully resolved entities from the orchestrator. Never does disambiguation.
 */

export function executeBookingCreate(data: ResolvedBookingCreate) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  // Build prefill data (same shape BookingForm expects)
  const prefill: Record<string, unknown> = {};
  if (data.client_id) prefill.client_id = data.client_id;
  if (data.date) prefill.date = data.date;
  if (data.duration) prefill.duration = data.duration;
  if (data.type) prefill.type = data.type;
  if (data.timeSlot) prefill.timeSlot = data.timeSlot;
  if (data.estimate) prefill.estimate = data.estimate;
  if (data.notes) prefill.notes = data.notes;
  if (data.rescheduled) prefill.rescheduled = data.rescheduled;

  // Show action confirmation in panel, then open form
  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening booking form...',
  });

  // Set prefill and open form
  ui.setPrefillBookingData(prefill as Parameters<typeof ui.setPrefillBookingData>[0]);

  // Close panel, then open form (small delay so the panel dismisses first)
  setTimeout(() => {
    store.closePanel();
    ui.openBookingForm();
  }, 300);
}

export function executeBookingOpen(data: ResolvedBookingOpen) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening booking...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setSelectedBookingId(data.booking_id);
  }, 300);
}

export function executeBookingEdit(data: ResolvedBookingEdit) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  // Build prefill from changes — only include fields that actually have values
  const prefill: Record<string, unknown> = {};
  if (data.changes.date) prefill.date = data.changes.date;
  if (data.changes.duration) prefill.duration = data.changes.duration;
  if (data.changes.type) prefill.type = data.changes.type;
  if (data.changes.timeSlot) prefill.timeSlot = data.changes.timeSlot;
  if (data.changes.estimate) prefill.estimate = data.changes.estimate;
  if (data.changes.notes) prefill.notes = data.changes.notes;
  if (data.changes.rescheduled !== undefined) prefill.rescheduled = data.changes.rescheduled;

  // Track only the fields that actually have values, not all keys
  ui.setChangedBookingFields(new Set(Object.keys(prefill)));

  ui.setPrefillBookingData(prefill as Parameters<typeof ui.setPrefillBookingData>[0]);

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening booking for editing...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.openBookingForm(data.booking_id);
  }, 300);
}
