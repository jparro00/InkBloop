import type { Booking, Client } from '../types';
import type { ConversationSummary } from '../services/messageService';
import type { ClientResolution, BookingResolution, ConversationResolution } from './types';

/**
 * Resolve a raw client name query against the client list.
 *
 * Priority:
 * 1. Exact full-name match (case-insensitive) → exact
 * 2. Single partial/first-name match → single
 * 3. Multiple partial matches → multiple (disambiguation needed)
 * 4. No matches → none
 */
export function resolveClient(query: string, clients: Client[]): ClientResolution {
  if (!query || !query.trim()) {
    return { type: 'none', query: query || '' };
  }

  const q = query.trim().toLowerCase();

  // 1. Exact full name match
  const exactMatch = clients.find((c) => c.name.toLowerCase() === q);
  if (exactMatch) {
    return { type: 'exact', client: exactMatch };
  }

  // 2-3. Partial / first-name matches
  const partials = clients.filter((c) => {
    const fullName = c.name.toLowerCase();
    const firstName = fullName.split(' ')[0];
    return fullName.includes(q) || firstName === q;
  });

  if (partials.length === 1) {
    return { type: 'single', client: partials[0] };
  }

  if (partials.length > 1) {
    return { type: 'multiple', clients: partials };
  }

  // 4. No match
  return { type: 'none', query };
}

/**
 * Resolve a booking from available hints.
 *
 * Filter strategy: use whatever hints are available (client, date, type).
 * If exactly one result → exact. If multiple → show selection. If none → none.
 *
 * For "open" and "edit" actions, we prefer the next upcoming booking by default.
 */
export function resolveBooking(
  hint: { client_id?: string; date?: string; type?: string },
  bookings: Booking[]
): BookingResolution {
  let candidates = bookings.filter(
    (b) => b.status !== 'Cancelled' && b.status !== 'No-show'
  );

  // Filter by client if provided
  if (hint.client_id) {
    candidates = candidates.filter((b) => b.client_id === hint.client_id);
  }

  // Filter by date if provided (same calendar day)
  if (hint.date) {
    const targetDate = new Date(hint.date).toISOString().split('T')[0];
    candidates = candidates.filter(
      (b) => new Date(b.date).toISOString().split('T')[0] === targetDate
    );
  }

  // Filter by type if provided
  if (hint.type) {
    const typeMatch = candidates.filter(
      (b) => b.type.toLowerCase() === hint.type!.toLowerCase()
    );
    // Only apply type filter if it narrows results (don't drop to 0)
    if (typeMatch.length > 0) {
      candidates = typeMatch;
    }
  }

  if (candidates.length === 0) {
    return { type: 'none' };
  }

  if (candidates.length === 1) {
    return { type: 'exact', booking: candidates[0] };
  }

  // If no date hint was given, prefer the next upcoming booking
  if (!hint.date) {
    const now = new Date();
    const upcoming = candidates
      .filter((b) => new Date(b.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length === 1) {
      return { type: 'exact', booking: upcoming[0] };
    }

    // If there are upcoming bookings, show those (not past ones)
    if (upcoming.length > 0) {
      return { type: 'multiple', bookings: upcoming.slice(0, 8) };
    }
  }

  // Multiple candidates — show selection cards (cap at 8)
  return {
    type: 'multiple',
    bookings: candidates
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8),
  };
}

/**
 * Resolve which conversation thread to use for a client.
 *
 * A client can have linked PSIDs for both Instagram and Facebook,
 * each mapping to a different conversation thread.
 */
export function resolveConversation(
  client: Client,
  conversations: ConversationSummary[]
): ConversationResolution {
  const matchingConvos: ConversationSummary[] = [];

  // Check Instagram PSID
  if (client.instagram) {
    const igConvo = conversations.find(
      (c) => c.participantPsid === client.instagram
    );
    if (igConvo) matchingConvos.push(igConvo);
  }

  // Check Facebook PSID
  if (client.facebook) {
    const fbConvo = conversations.find(
      (c) => c.participantPsid === client.facebook
    );
    if (fbConvo) matchingConvos.push(fbConvo);
  }

  if (matchingConvos.length === 0) {
    return { type: 'none' };
  }

  if (matchingConvos.length === 1) {
    return { type: 'exact', conversation: matchingConvos[0] };
  }

  return { type: 'multiple', conversations: matchingConvos };
}
