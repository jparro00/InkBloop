# Simulator

Standalone Meta API stand-in for local development. Mimics Facebook Messenger + Instagram DM APIs (Graph v25.0) so you can build/test message flows without a real Meta app, page, or Instagram business account. Ships with 8 seeded contacts + conversations, a chat UI, HMAC-signed webhook delivery, and an env switcher for pointing at prod vs dev Supabase.

## What the simulator does

- Replaces the need for a real Facebook app / page / IG business account in dev.
- In-memory store (local) or DB-backed store (cloud) of profiles, conversations, messages.
- Full Graph API mock (v25.0): Send API, Conversations API, user profile lookups.
- Test UI for sending messages as a "customer" — each send fires a real HMAC-signed webhook to the `webhook` edge function.
- Live webhook delivery log visible inside the simulator chat UI.
- Env switcher (prod vs dev Supabase) via the `sim_config` table.

## Key files

### Local Express server (`simulator/`)
- `server.js` — Main server: Graph API emulation, webhook verification endpoint, Send API mock, WebSocket broadcast, `/sim/*` helper routes.
- `lib/webhook.js` — HMAC signing, event builders (message / delivery / read / profile_update), delivery transport (5 s timeout).
- `lib/store.js` — In-memory data model: profiles, conversations, messages; mirrors Meta's schema.
- `lib/ids.js` — Meta-format ID generators (`m_...` for messages, `t_...` for conversations).
- `seed.js` — 8 default contacts + pre-seeded booking conversations.
- `public/index.html`, `public/app.js`, `public/styles.css` — Simulator web UI.

### Cloud-hosted bridge (Supabase)
- `supabase/functions/sim-api/index.ts` — Deno edge function exposing `/sim/*` endpoints; DB-backed store via `sim_*` tables; serves signed avatar URLs from the `avatars` bucket.
- `supabase/functions/webhook/index.ts` — Receives webhooks (both from simulator and real Meta). HMAC-validates, upserts `messages`/`participant_profiles`, broadcasts via Realtime.

## Architecture

### Local dev flow

```
Browser (simulator UI @ :3001)
  ↔ WebSocket ↔ Express server (port 3001)
                   ↓ in-memory store
                   ↓ on "send": POST + HMAC → webhook URL (Supabase edge fn)
                                ↓
                        webhook validates signature
                        ↓ upserts messages/participant_profiles
                        ↓ Realtime broadcast → user-{OWNER_USER_ID} channel
                                                  ↓
                                    main Ink Bloop app subscribes → UI updates live
```

WebSocket is **dev-only infrastructure** for broadcasting state changes across multiple simulator UI tabs on the same machine. Not part of the Meta API surface.

### Cloud flow

```
Browser (simulator UI)
  ↔ REST ↔ sim-api edge fn (Deno)
              ↓ reads/writes sim_* tables
              ↓ on "send": POST + HMAC → webhook edge fn (same signing)
```

In the cloud path, live updates to the simulator UI come from Supabase Realtime subscriptions on `sim_messages` / `sim_conversations` / `sim_profiles` (all have Realtime enabled).

### Environment switcher

`sim_config` table (single row, id=1) stores `webhook_url`, `verify_token`, `app_secret`, `access_token`, `page_id`, `ig_user_id`. Simulator UI's `GET/POST /sim/config` endpoints let you change these at runtime without restarting.

## Commands

```bash
npm run sim        # Express server on :3001 (UI at http://localhost:3001)
npm run sim:dev    # Same but with node --watch (live reload on file changes)
```

Graph API endpoints available at `http://localhost:3001/v25.0/...`.

Cloud deploy:
```bash
npx supabase functions deploy sim-api --project-ref <ref> --no-verify-jwt
```

## Supabase `sim_*` tables

| Table | Purpose |
|-------|---------|
| `sim_config` | Single row (id=1): `page_id`, `ig_user_id`, `webhook_url`, `verify_token`, `app_secret`, `access_token`. |
| `sim_profiles` | Contacts — `psid` (pk), `first_name`, `last_name`, `name`, `platform`, `profile_pic` (Storage path), `instagram` handle. |
| `sim_conversations` | `id` (pk), `platform`, `participant_psid` (fk), `updated_time` (unix ms), `read_watermark`. |
| `sim_messages` | `mid` (pk), `conversation_id` (fk), `sender_id`, `recipient_id`, `text`, `attachments` (jsonb), `timestamp`, `is_echo`. |

No RLS — access is controlled at the edge-function layer. The simulator is a dev tool, not a multi-tenant product.

## `sim-api` endpoints

All relative to `/functions/v1/sim-api/`:

| Endpoint | What |
|----------|------|
| `GET /sim/conversations` | All conversations + full message history (uncapped, unlike `messages` table). |
| `GET /sim/profiles` | All contacts with signed avatar URLs. |
| `GET /sim/config` | Current config. |
| `POST /sim/config` | Update config fields. |
| `POST /sim/send` | Client sends a message; inserts into `sim_messages`, updates `sim_conversations.updated_time`, fires webhook (HMAC-signed) with message + delivery + read events. |
| `POST /sim/contacts` | Create a new contact; inserts profile + empty conversation. |
| `POST /sim/contacts/:psid/avatar` | Binary image upload (256 KB cap); writes to `avatars` bucket; fires `profile_update` webhook. |

No user auth — these endpoints are public dev infrastructure. All DB writes use the service role. HMAC signing on webhook delivery is the security boundary, not API auth.

## Webhook handling

Both simulator sends and real Meta sends hit the same `webhook` edge function. Both must include `X-Hub-Signature-256: sha256=<hex>` — the HMAC-SHA256 of the raw body using `APP_SECRET`. Invalid signature → 401.

Platform detection: `payload.object` — `"instagram"` → Instagram, anything else → Messenger.

Special event: `profile_update` is a simulator-specific event (not in real Meta) so avatar changes can propagate live. The webhook handler upserts `participant_profiles` and broadcasts; the main app re-signs avatar URLs on receipt.

## Gotchas

1. **HMAC secret mismatch** → silent 401. Local default `APP_SECRET=inkbloop-dev-secret`; prod must match the deployed edge fn's env var. Debug by comparing raw bytes + secret; common cause is body reparsing changing the bytes.
2. **Access token mismatch** → `graph-api` mock returns 401 "Invalid OAuth access token". Default local `ACCESS_TOKEN=SIM_ACCESS_TOKEN_DEV`. Check `Authorization: Bearer <token>` header or `?access_token=` query param.
3. **Page/IG IDs**: defaults `page_id=111222333444555`, `ig_user_id=999888777666555`. The Send API dispatches by recipient PSID prefix (`igsid-*` → IG). Main webhook handler ignores which id was used — it reads platform from `payload.object`.
4. **Avatar storage refactor** (migration 00015): profile pics are now short paths in the `avatars` bucket, not base64 data URLs. Legacy data-URL rows pass through unchanged (resolver handles both). Signed URLs have 1 h TTL server-side, 24 h for app-side signing.
5. **Webhook payload shape** matches Meta exactly: `{ object, entry: [{ id, time, messaging: [{ sender, recipient, timestamp, message | delivery | read }] }] }`. Echo messages have `is_echo: true`.
6. **Reset simulator state**: delete rows from `sim_messages` → `sim_conversations` → `sim_profiles` (FK order), then re-run `seed()` locally or reload seed SQL to dev DB. In-memory store loses state on process restart — intentional for local testing.
7. **24-hour reply window**: local simulator has `enforce24hrWindow: false` — you can message "outside the window" without restriction. Real Instagram enforces 24 h after the customer's last message; Messenger has no window. Test window-sensitive behaviour against real Meta in staging.
8. **No cascade cleanup of Storage objects** when a profile is deleted — avatar blobs remain in the bucket. Clean up manually if it matters.

## Related docs

- [messaging.md](./messaging.md) — how webhook + Realtime deliver messages into the main app.
- [deployment.md](./deployment.md) — `sim-api` deploy command, `--no-verify-jwt` rule, pending prod changes around the avatar bucket.
- [supabase.md](./supabase.md) — `sim_*` table schemas, RLS notes, `avatars` bucket policy.
