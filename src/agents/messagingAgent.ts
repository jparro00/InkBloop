import { useAgentStore } from '../stores/agentStore';
import { useUIStore } from '../stores/uiStore';
import { useMessageStore } from '../stores/messageStore';
import { useBookingStore } from '../stores/bookingStore';
import { format } from 'date-fns';
import type { DraftTemplate, ResolvedMessagingOpen, ResolvedMessagingDraft } from './types';

/**
 * Messaging Agent — pure executor.
 * Receives resolved conversation_id from orchestrator.
 */

export function executeMessagingOpen(data: ResolvedMessagingOpen) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening conversation...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setSelectedConversationId(data.conversation_id);
  }, 300);
}

export function executeMessagingDraft(data: ResolvedMessagingDraft) {
  const store = useAgentStore.getState();

  // Show template cards in the agent panel — user taps one to proceed
  store.replaceLastLoading({
    text: `Choose a message template for ${data.client_name}:`,
    selections: {
      type: 'template',
      items: data.templates,
      mode: 'single',
      context: 'draft_template',
    },
  });
}

/**
 * Called when user taps a template card.
 * Opens ConversationDrawer with the template text as a draft in the composer.
 */
export function applyDraftTemplate(
  conversationId: string,
  templateText: string
) {
  const store = useAgentStore.getState();
  const ui = useUIStore.getState();
  const messageStore = useMessageStore.getState();

  // Set the draft in the message store (composer reads from this)
  messageStore.setDraft(conversationId, templateText);

  store.replaceLastLoading({
    status: 'action_taken',
    actionLabel: 'Opening conversation with draft...',
  });

  setTimeout(() => {
    store.closePanel();
    ui.setSelectedConversationId(conversationId);
  }, 300);
}

/**
 * Build draft templates for a client, filling in booking context.
 */
export function buildTemplates(
  clientId: string,
  clientName: string,
  draftContext?: 'reminder' | 'followup' | 'reschedule'
): DraftTemplate[] {
  const bookings = useBookingStore.getState().bookings;

  // Find next upcoming booking for this client
  const now = new Date();
  const nextBooking = bookings
    .filter(
      (b) =>
        b.client_id === clientId &&
        new Date(b.date) >= now &&
        b.status !== 'Cancelled' &&
        b.status !== 'No-show'
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  // Find most recent past booking
  const lastBooking = bookings
    .filter(
      (b) =>
        b.client_id === clientId &&
        new Date(b.date) < now &&
        b.status === 'Completed'
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const firstName = clientName.split(' ')[0];
  const templates: DraftTemplate[] = [];

  // Reminder template (only if there's an upcoming booking)
  if (nextBooking) {
    const dateStr = format(new Date(nextBooking.date), 'EEEE, MMMM d');
    const timeStr = format(new Date(nextBooking.date), 'h:mm a');
    templates.push({
      id: 'reminder',
      label: 'Appointment reminder',
      icon: '📅',
      text: `Hi ${firstName}! Just a reminder about your ${nextBooking.type.toLowerCase()} on ${dateStr} at ${timeStr}. See you then!`,
    });
  }

  // Follow-up template (if there's a past booking)
  if (lastBooking) {
    templates.push({
      id: 'followup',
      label: 'Follow-up',
      icon: '💬',
      text: `Hi ${firstName}, how's your ${lastBooking.type.toLowerCase()} healing? Let me know if you have any questions!`,
    });
  }

  // Reschedule template (if there's an upcoming booking)
  if (nextBooking) {
    const dateStr = format(new Date(nextBooking.date), 'EEEE, MMMM d');
    templates.push({
      id: 'reschedule',
      label: 'Reschedule',
      icon: '🔄',
      text: `Hi ${firstName}, I need to reschedule your ${nextBooking.type.toLowerCase()} on ${dateStr}. Would another day this week work for you?`,
    });
  }

  // Generic greeting (always available)
  templates.push({
    id: 'greeting',
    label: 'General message',
    icon: '👋',
    text: `Hi ${firstName}! `,
  });

  // If a specific context was requested, move that template to the front
  if (draftContext) {
    const idx = templates.findIndex((t) => t.id === draftContext);
    if (idx > 0) {
      const [t] = templates.splice(idx, 1);
      templates.unshift(t);
    }
  }

  return templates;
}
