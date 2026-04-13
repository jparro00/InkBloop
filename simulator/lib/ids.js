import { randomBytes } from 'crypto';

/**
 * Generate IDs matching Meta's real formats.
 *
 * Message IDs:      "m_" + alphanumeric (Meta uses base64-ish strings)
 * Conversation IDs: "t_" + numeric
 */

export function messageId() {
  return 'm_' + randomBytes(16).toString('base64url');
}

export function conversationId() {
  return 't_' + randomBytes(8).toString('hex');
}
