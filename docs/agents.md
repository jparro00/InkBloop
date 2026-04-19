# Agent system

Multi-intent orchestration for the voice/text assistant. User input (voice or typed) → classify intent via Claude Haiku → resolve entities (which client/booking?) → delegate to a sub-agent → render result in `AgentPanel`. Feedback is captured with a full trace of the exchange and fed back into prompt tuning via the eval suite.

## Key files

### Entry + routing
- `src/agents/orchestrator.ts` — Central router: processes input, calls `agent-parse`, stashes pending intent, routes to sub-agent, handles disambiguation.
- `src/agents/resolvers.ts` — Exact/fuzzy client matching, booking filtering, conversation lookup.

### Sub-agents (pure executors — no AI, no disambiguation)
- `src/agents/bookingAgent.ts` — create / open / search / edit / delete bookings.
- `src/agents/clientAgent.ts` — create / open / search / edit / delete clients.
- `src/agents/scheduleAgent.ts` — count / list / available / summary queries, all from local `bookingStore` (zero API calls).
- `src/agents/messagingAgent.ts` — open conversation, draft template replies (reminder / follow-up / reschedule / generic).
- `src/agents/feedbackAgent.ts` — pre-fills the feedback textarea.

### Types + config
- `src/agents/types.ts` — `AgentIntent`, `AgentMessage`, resolution types, sub-agent payloads.
- `src/agents/scheduleConfig.ts` — working hours, morning/evening boundaries, default session length.

### UI + state
- `src/stores/agentStore.ts` — messages, pending intent/resolved entities, trace, feedback prompt state.
- `src/hooks/useVoiceRecorder.ts` — tap-to-record, silence detection, posts to `transcribe-audio`.
- `src/components/agent/AgentPanel.tsx` — modal shell (messages + composer + mic).
- `src/components/agent/AgentMessages.tsx` — renders messages + selection cards.
- `src/components/agent/{ClientCard,BookingCard,ConversationCard,TemplateCard}.tsx` — disambiguation cards.
- `src/components/agent/{MicButton,LoadingIndicator,ScheduleResponse,AgentFeedbackPrompt}.tsx` — UI bits.

### Backend
- `supabase/functions/agent-parse/index.ts` — Claude Haiku intent classifier.
- `supabase/functions/agent-resolve-edit/index.ts` — Claude Haiku for contextual client edits ("add two t's to the last name").
- `supabase/functions/transcribe-audio/index.ts` — Groq Whisper transcription.

### Evals
- `evals/agent-evals.json` — 60+ test cases across all intent categories.
- `scripts/run-evals.mjs` — CLI runner: authenticates, calls agent-parse, diff-checks expected vs actual.

## Intent flow

1. **Voice** (optional): mic button → `useVoiceRecorder` captures audio (silence detect at RMS < 0.02 for 2 s, or 15 s cap) → `transcribe-audio` edge fn → Groq Whisper → text.
2. **Text** (either typed or from step 1) → `orchestrator.processInput(text)`.
3. **Intent parse**: `agent-parse` edge fn decrypts user's Anthropic key, calls Claude Haiku with system prompt (current date, all intent definitions) → returns `{ agent, action, entities }` as JSON.
4. **Stash**: `orchestrator.setPending(intent)`; `pendingResolved = {}`.
5. **Route**: `routeIntent()` dispatches to the intent's router (e.g. `routeBooking`).
6. **Resolve entities**: resolvers fuzzy-match client names (edit distance + word overlap), filter bookings by date/client. Branches:
   - Exact single match → proceed.
   - Multi-match → render selection cards, pause.
   - No match + suggestions → show fuzzy hits + "Create new" button, pause.
7. **Disambiguation pause**: user taps card → `handleSelection()` writes to `pendingResolved[key] = selectedId` → `routeIntent()` resumes.
8. **Edit resolution** (client/edit only): `agent-resolve-edit` edge fn takes current client + natural-language edit request → returns minimal field diff.
9. **Execute**: sub-agent runs (e.g. `executeBookingCreate()`) — prefills forms, triggers modals, or dispatches navigation events. `ScheduleAgent` is pure local read.
10. **Result + trace**: sub-agent calls `store.replaceLastLoading()` with success message. Every step (user input, edge call latency, resolver outcome, sub-agent action, errors) is appended to `agentStore.trace`.
11. **Feedback prompt**: when panel closes with a non-empty trace, a prompt shows for 3 s above the FAB → tap opens Feedback tab with trace attached.

## Intent types

Categories from the `agent-parse` system prompt:

| Agent | Actions |
|-------|---------|
| `booking` | create, search, open, edit, delete |
| `client` | create, search, open, edit, delete |
| `schedule` | query (count / list / available / summary) |
| `messaging` | open, draft |
| `feedback` | draft |

Representative prompts: `"book chris friday 2pm"` → booking/create; `"am I free friday"` → schedule/query; `"send sarah a reminder"` → messaging/draft; `"feedback: calendar feels slow"` → feedback/draft.

## Store shape (agentStore)

```
messages: AgentMessage[]               // rendered in panel
isProcessing: boolean                  // spinner
panelOpen: boolean

pendingIntent: AgentIntent | null      // stashed after parse
pendingResolved: Record<string, any>   // accumulated resolved entities

trace: TraceEvent[]                    // events in current exchange
traceStartedAt: number | null
traceActive: boolean
feedbackPrompt: FeedbackPromptState | null
```

Key actions: `openPanel`, `closePanel`, `addUserMessage`, `addAgentMessage`, `setLoading`, `replaceLastLoading`, `setPending`, `updatePendingResolved`, `startTrace`, `logTrace`, `showFeedbackPrompt`, `clearFeedback`.

Store is ephemeral (not persisted) — resets on each new exchange. Integrates with `uiStore` (form state, navigation), `bookingStore`, `clientStore`, `messageStore` for data reads and writes.

## Edge functions

### `agent-parse`

- In: `{ text }` + bearer token.
- Out: `{ agent, action, entities }` or `{ error }`.
- Decrypts Anthropic key from `user_settings.anthropic_key` (AES-GCM via `API_KEY_SECRET`).
- Model: `claude-haiku-4-5-20251001`, max_tokens 400.
- System prompt includes today's date, weekday, current year, all intent definitions.
- Client-side wraps the call in a 30 s timeout.

### `agent-resolve-edit`

- In: `{ text, client: { name, phone, tags, dob } }`.
- Out: minimal field diff (only changed fields).
- Same decrypt path + same Haiku model.

### `transcribe-audio`

- In: raw audio blob + content-type (webm/mp4/etc.).
- Out: `{ text }`.
- POSTs multipart to Groq at `https://api.groq.com/openai/v1/audio/transcriptions`, model `whisper-large-v3-turbo`, temperature 0.
- Env: `GROQ_API_KEY` (shared server-side key).
- File size cap 25 MB; typical clip ~250 KB.

## Disambiguation UI

Each card type corresponds to a selection context:

| Card | Used in contexts | Selection |
|------|-----------------|-----------|
| `ClientCard` | `ambiguous_client`, `no_match`, `search_results` | `handleSelection('client', id)` |
| `BookingCard` | `ambiguous_booking`, `search_results` | `handleSelection('booking', id)` |
| `ConversationCard` | `platform_choice` | `handleSelection('conversation', id)` |
| `TemplateCard` | `draft_template` | `applyDraftTemplate()` — opens drawer with draft |
| `ConfirmOption` | `confirm_delete_booking`, `confirm_delete_client` | `handleSelection('confirm', 'yes'|'cancel')` |

All cards live inside `AgentMessages` and read from `agentStore.messages[].selections`.

## Evals

`evals/agent-evals.json` structure:

```json
{
  "test_clients": [ { name, phone, tags, ... } ],
  "evals": [
    {
      "id": "booking-create-exact",
      "category": "booking/create",
      "prompt": "book sarah friday 2pm",
      "expected_parse": { "agent": "booking", "action": "create", "entities": {...} },
      "resolution": "Exact single match on 'sarah'",
      "expected_outcome": "BookingForm opens with client=Sarah Kim..."
    }
  ]
}
```

`scripts/run-evals.mjs`:
- Authenticates with `EVAL_EMAIL` / `EVAL_PASSWORD` (from `.env`).
- Calls `agent-parse` for each eval `prompt`.
- Asserts `agent` + `action` exact match; entities field-by-field (case-insensitive names; date/dob skipped for year drift).
- Writes `evals-results.json`, prints pass/fail summary.
- Run: `npm run eval`, or per-category `npm run eval:booking` etc.

## Gotchas

1. **Per-user Anthropic key** is AES-GCM-encrypted in `user_settings.anthropic_key` using env `API_KEY_SECRET`. Never exposed to the browser. Missing key → HTTP 400 "No API key configured".
2. **Rate limits** — Anthropic per subscription tier (Haiku is the cheap option); Groq shared across users; Supabase edge fn timeout 300 s; orchestrator caps at 30 s client-side.
3. **Offline**: voice recording works; transcription / parse / edits fail with error message. **Schedule agent works offline** — it reads `bookingStore` only.
4. **Non-streaming everywhere** — no streaming audio upload, no streaming completion. Loading indicator covers the whole call.
5. **Feedback → evals tie-in is loose**. Feedback captures the full trace; it's not automatically fed into the eval suite. Manual review informs prompt tweaks.
6. **Schedule agent respects `scheduleConfig.ts`** — working hours, morning/evening split, default session length. Edit that file, not the agent, to change availability rules.
7. **Navigation via custom events** — agents dispatch `agent-navigate`, `agent-create-client`, etc. for cross-tab communication rather than directly calling the router. Grep for `agent-` event names if you're tracing a nav bug.
8. **Intent parse is one-shot**. No chain-of-thought, no tool use. If the prompt is ambiguous between two agents, the parser picks one — the user sees disambiguation cards or a surprising result.

## Related docs

- [messaging.md](./messaging.md) — messaging agent drafts/opens via `messageService` + `messageStore`.
- [bookings.md](./bookings.md) — booking agent is the executor for all booking intents.
- [clients.md](./clients.md) — client agent + edit-resolve flow.
- [supabase.md](./supabase.md) — edge function deploy + secret env vars.
- [deployment.md](./deployment.md) — `API_KEY_SECRET`, `GROQ_API_KEY` rotation rules.
