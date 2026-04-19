# Messaging

Inbound Instagram/Messenger DMs land via Meta webhook, get stored in Supabase, render in the app in realtime. Outbound replies go through a `graph-api` edge function that either forwards to real Meta (prod) or acts as a local mock (dev simulator).

## Key files

- `src/stores/messageStore.ts` — Zustand store for conversations, messages, drafts, realtime subs; persists conversations/drafts/read watermarks to `localStorage`.
- `src/services/messageService.ts` — Meta Graph API wrapper (send, fetch conversations/messages), Supabase queries, avatar signing.
- `src/pages/Messages.tsx` — Conversation list, search, mark-read-on-open.
- `src/components/messaging/ConversationDrawer.tsx` — Chat detail: bubbles, composer, image send, link-to-client, load-older pagination, swipe-to-close.
- `supabase/functions/webhook/index.ts` — Receives Meta webhook, HMAC-verifies, upserts `messages` + `participant_profiles`, broadcasts via Realtime.
- `supabase/functions/graph-api/index.ts` — Meta Graph API mock in dev; routes through to real Meta in prod. Handles send, mark_seen, conversation/message/profile lookup.

## Data flow

### Inbound

1. Meta POSTs to `webhook` edge fn → HMAC-SHA256 verified against `APP_SECRET`.
2. Event parsed (mid, sender, recipient, platform, text, attachments, timestamp).
3. Sender profile looked up in `sim_profiles` (simulator) or fetched from Meta → upserted into `participant_profiles`.
4. Message row upserted (by `mid`); rows pruned to last 20 per conversation.
5. Realtime broadcast on channel `user-{user_id}` with event `new-message`.
6. Client store receives broadcast → `fetchSingleMessage()` → updates conversation list inline, refreshes drawer if open, auto-marks read if drawer is focused.

### Outbound

1. User sends from `ConversationDrawer` → `messageStore.sendMessage()`.
2. `messageService` POSTs to `graph-api` → (dev) writes to `sim_messages`, (prod) forwards to Meta.
3. Optimistic bubble shown immediately; `mid` returned by API.
4. Message upserted into `messages` (`is_echo = true`) + Realtime broadcast.
5. `markConversationRead()` upserts `conversation_reads` + broadcasts read event.

## Supabase tables

| Table | Purpose | Notes |
|-------|---------|-------|
| `messages` | Rolling 20-msg cap per conversation | RLS by `user_id`. Broadcasts on insert. |
| `conversation_reads` | `(user_id, conversation_id) → last_read_mid` | Read-watermark sync across devices. |
| `participant_profiles` | `(user_id, psid) → name + avatar path` | Upserted by webhook; Realtime on UPDATE. |
| `conversation_map` | Cache of internal `conversation_id` ↔ Meta Graph `graph_conversation_id` | Lazy-populated on older-message fetch. |
| `sim_*` | Simulator-only; no RLS | See [simulator.md](./simulator.md). |

## Edge functions

### `webhook`

- **GET**: Meta verification handshake (`hub.verify_token` check).
- **POST**: receives message + `profile_update` events; HMAC-verifies; upserts via service-role key.
- Env: `WEBHOOK_VERIFY_TOKEN`, `APP_SECRET`, `OWNER_USER_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Uses service role (no user context) — broadcasts to the fixed `OWNER_USER_ID`.
- Broadcasts are best-effort (errors caught silently; DB is source of truth).

### `graph-api`

- Dev: mocks `/v25.0/*` endpoints backed by `sim_*` tables, validates `access_token` against `sim_config.access_token`.
- Prod: forwards to real Meta at `${VITE_META_API_URL}/v25.0/...`.
- Cursor pagination uses array indices (numeric, stringified) — **not opaque tokens**. Indices shift if messages are added between requests.

## Store shape (messageStore)

Persisted (localStorage key = the store default):

- `conversations: ConversationSummary[]` — open chats with last-message preview, unread count, participant name/pic.
- `readMids: Record<conversationId, lastReadMid>`.
- `drafts: Record<conversationId, text>`.

Ephemeral:

- `currentMessages` — what the drawer shows (older Graph-API msgs + last-20 DB msgs, concat'd oldest-first).
- `olderMessages` — pagination buffer fetched via graph-api on "Load older".
- `messageCache` — last 20 per conversation for instant re-open.

Realtime subscriptions (`startRealtime()`):

- `new-message` — refresh conversation list + drawer, auto-mark-read if focused.
- `conversation-read` — sync read watermark from another device.
- `profile-updated` — refetch + re-sign avatars.

Key actions: `fetchConversations(force?)` (30s staleness guard), `fetchMessages(conversationId)`, `sendMessage`, `sendImage`, `markRead`.

## Gotchas

1. **20-message DB cap** — webhook and outbound both prune to 20/conversation. Older messages come from Graph API on demand; can return empty if Meta no longer serves them.
2. **Cursor pagination is index-based** in `graph-api`, not opaque tokens — concurrent writes can shift the cursor.
3. **Signed avatar URLs** — 24h TTL, refreshed client-side at 20h. Legacy `data:` base64 URLs pass through unchanged. Never log or expose signed URLs.
4. **Read watermarks never expire** — a message that's never marked read stays unread forever. The drawer auto-marks read on focus, so this is usually fine; batch tools must call `markRead` explicitly.
5. **Broadcasts are best-effort.** DB is authoritative. A failed broadcast just means no live update; refresh fixes it.
6. **Webhook uses service-role** and broadcasts to a fixed `OWNER_USER_ID`. If multi-user webhook support is ever needed, the function must derive `user_id` from payload and broadcast to per-user channels.
7. **Image payloads are data URLs** end-to-end in dev — `ConversationDrawer` renders them directly. In prod they'd be Meta attachment URLs.
8. **Meta rate limit: 200/hr per page** — only hit `graph-api` for sends or explicit older-message fetches. Never on page load.

## Related docs

- [clients.md](./clients.md) — conversations link to clients via PSID (`clientStore.linkPlatform`).
- [agents.md](./agents.md) — messaging agent can draft replies and open conversations.
- [simulator.md](./simulator.md) — how the simulator fires webhooks and mocks Graph API.
- [supabase.md](./supabase.md) — schema details, RLS, realtime config.
