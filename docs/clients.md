# Clients

Customers / leads. A client has name, display_name, phone, email, DOB, channel, tags, notes, and optional linked Instagram/Messenger PSIDs. Avatars are resolved via a private Storage bucket (recent refactor from base64 in DB). Client detail view shows overview + appointments + photos + documents + notes.

## Key files

- `src/stores/clientStore.ts` — Client CRUD, linked-profile map (PSID → name/pic), search, notes. Persists to `inkbloop-clients`.
- `src/stores/documentStore.ts` — Document metadata (consent forms etc.). Persists to `inkbloop-documents`.
- `src/services/clientService.ts` — Supabase ops + `resolveAvatarUrls()` helper (batch signed URLs).
- `src/services/documentService.ts` — Upload to `documents` bucket, insert metadata, delete, generate signed URLs (1h TTL).
- `src/pages/Clients.tsx` — List with search (name/phone/tags/linked profile names), stats, profile pic rendering.
- `src/pages/ClientDetail.tsx` — Tabs: overview, appointments, photos, documents, notes.
- `src/components/client/{ClientForm,CreateClientForm,ClientCard}.tsx` — Client UI.
- `src/components/agent/ClientCard.tsx` — Reusable agent-context variant.

## Data flow

### CRUD

1. `ClientsPage` mounts → `clientStore.fetchClients()` → `clientService.fetchClients()` (select `*`) → `resolveAvatarUrls()` batch-signs avatar paths → store.
2. Create / update / delete use optimistic mutation + rollback. Delete cascades: bookings FK set null, documents cascade-delete.
3. Search is client-side only (local filter on name/phone/tags/linked profile names). All clients fetched on load.

### Avatar resolution

`participant_profiles.profile_pic` and `clients.profile_pic` can hold three things:

- `null` — no avatar.
- Legacy `data:image/...` base64 URL — passed through unchanged.
- Path into `avatars` Storage bucket (e.g. `igsid-abc.jpg`).

`resolveAvatarUrls()` batch-signs paths via `createSignedUrls()` (24 h TTL). Signed URLs are cached in memory client-side and refreshed every ~20 h. Batch failures return `null` for that ID instead of crashing.

### Documents

1. ClientDetail → `uploadDocument()` — UUID → store at `{user_id}/{client_id}/{doc_id}.{ext}` in `documents` bucket.
2. Insert metadata row (client_id FK, optional booking_id, type, mime, size).
3. Viewing: `getSignedUrl(path, 3600)` → open in browser.
4. Delete removes Storage object + DB row.

## Supabase tables + storage

### `clients`

`id`, `user_id`, `name`, `display_name`, `phone`, `email`, `dob`, `channel` ('Facebook'|'Instagram'|'Phone'), `instagram` (PSID), `facebook` (PSID), `psid`, `tags` (text[]), `notes` (jsonb), `profile_pic`, timestamps.

- Indexes: `user_id`, trigram on `name` (for future server-side search; currently unused).
- RLS: all CRUD gated by `user_id`.

### `participant_profiles`

PK `(user_id, psid)`. Columns: `name`, `profile_pic`, `platform`, `updated_at`. Upserted by `webhook` edge fn on inbound DMs. Realtime-enabled.

### `documents`

`id`, `user_id`, `client_id` (fk, cascade), `booking_id` (optional fk), `type`, `label`, `storage_path`, `is_sensitive`, `mime_type`, `size_bytes`, `notes`. RLS by `user_id`.

### Storage buckets

- `avatars` (private, 256 KB cap, jpeg/png/webp) — authenticated read; service-role write (via `sim-api` or webhook).
- `documents` (private) — users CRUD within own folder.

See [supabase.md](./supabase.md) for full bucket policies.

## Stores

### clientStore (Zustand + persist)

State: `clients`, `linkedProfiles: Record<psid, LinkedProfile>`, `isLoading`, `error`. Persists `clients` + `linkedProfiles` to `inkbloop-clients`.

Actions: `fetchClients`, `getClient`, `addClient`, `updateClient`, `deleteClient`, `addNote`, `searchClients`, `findByPsid`, `linkPlatform`, `unlinkPlatform`.

### documentStore (Zustand + persist)

State: `documents`, `isLoading`. Actions: `fetchDocuments`, `getDocumentsForClient`, `getDocumentsForBooking`, `uploadDocument`, `removeDocument`.

## Gotchas

1. **Signed avatar URLs cache in memory** (not persisted). 24 h TTL on Supabase side; client refreshes at 20 h. Batch sign failures → `null` for those IDs, never a crash.
2. **Legacy base64 avatars** still exist in some rows — the resolver passes `data:` URLs through untouched. Those rows remain bloated until a one-off cleanup task runs.
3. **`participant_profiles` vs `clients`** — different concepts. `participant_profiles` is the raw conversation-participant model (populated by webhook; one row per PSID). `clients` is the app's customer model — optionally links to one IG PSID and one Messenger PSID. The UI merges: if `client.instagram` is set, display `linkedProfiles[instagram].name` / profile pic from the linked profile.
4. **`channel` field is currently unused in UI.** Intended for preferred-channel routing; safe to ignore unless you're adding that feature.
5. **Search is 100% local.** No server-side search implemented; trigram index on `name` is ready for it.
6. **Offline reads work** (store persists); writes fail gracefully (optimistic rollback).
7. **Delete cascade**: client delete → `bookings.client_id` set null (booking history preserved), `documents` rows cascade-delete (Storage objects remain unless cleaned).
8. **AI-suggested edits** are flagged on form fields via `uiStore.pendingClientChanges` / `changedClientFields` so users can see what the agent wants to change before saving.

## Related docs

- [messaging.md](./messaging.md) — `linkPlatform(clientId, platform, psid)` ties a conversation to a client; `findByPsid` maps PSID → client for quick-create flow.
- [bookings.md](./bookings.md) — `bookings.client_id` FK; bookings for a client are fetched from `bookingStore.getBookingsForClient`.
- [agents.md](./agents.md) — `clientAgent.ts` handles client/create, client/open, client/edit, client/delete intents.
- [supabase.md](./supabase.md) — schema + RLS + bucket details.
