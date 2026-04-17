# Prod Deployment Checklist

Prod = `jpjvexfldouobiiczhax` (Ink Bloop). Dev = `kshwkljbhbwyqumnxuzu` (Ink Bloop Dev).

The Supabase MCP is configured for **prod**. The Supabase CLI is normally linked to prod as well. For dev work, temporarily `supabase link --project-ref kshwkljbhbwyqumnxuzu`, do the work, then relink back to prod.

A merge to `main` only ships the frontend. Database schema changes, RLS policies, and edge functions each ship through their own channel and must be applied explicitly. This doc tracks what has been applied to dev but not yet to prod.

---

## Pending prod changes

### 1. Migration `00013_agent_feedback.sql`
- **Status on dev:** applied
- **Status on prod:** **ALREADY APPLIED** (was applied via MCP earlier — do NOT re-run)
- Creates `agent_feedback` table + RLS policies. Non-breaking.

### 2. Migration `00014_add_cover_up_booking_type.sql`
- **Status on dev:** applied
- **Status on prod:** **ALREADY APPLIED** (was applied via MCP earlier — do NOT re-run)
- Broadens `bookings_type_check` to allow `'Cover Up'`. Non-breaking (existing rows are unaffected; rejects nothing that was previously accepted).

### 3. Edge function `agent-parse`
- **Status on dev:** deployed (knows about Cover Up, delete actions, dob, find_slot, `--no-verify-jwt`)
- **Status on prod:** deployed (older revision — knows Cover Up but NOT delete/dob/find_slot)
- **Action when ready for prod:**
  ```
  npx supabase functions deploy agent-parse --project-ref jpjvexfldouobiiczhax --no-verify-jwt
  ```
- Safe to leave in the interim — prod frontend doesn't call the new code paths yet.

### 4. Edge function `agent-resolve-edit`
- **Status on dev:** deployed (knows about `dob` field, `--no-verify-jwt`)
- **Status on prod:** older revision — does NOT know about `dob`
- **Action when ready for prod:**
  ```
  npx supabase functions deploy agent-resolve-edit --project-ref jpjvexfldouobiiczhax --no-verify-jwt
  ```

### 5. Edge function `parse-booking`
- **Status on dev:** deployed (knows about Cover Up)
- **Status on prod:** NOT YET DEPLOYED — still only knows the original 4 types
- **Action when ready for prod:**
  ```
  npx supabase functions deploy parse-booking --project-ref jpjvexfldouobiiczhax --no-verify-jwt
  ```

### 6. Edge function `transcribe-audio` (new)
- **Status on dev:** deployed (voice input → Groq Whisper Large V3 Turbo)
- **Status on prod:** NOT YET DEPLOYED — function does not exist on prod
- **Prereq secret:** `GROQ_API_KEY` must be set on the prod project before deploy
  ```
  npx supabase secrets set GROQ_API_KEY=<key> --project-ref jpjvexfldouobiiczhax
  ```
- **Action when ready for prod:**
  ```
  npx supabase functions deploy transcribe-audio --project-ref jpjvexfldouobiiczhax --no-verify-jwt
  ```

### 7. Frontend
Rolls up every pending frontend-visible change:
- Cover Up booking type + blue swatch + 3h default
- "Inklet - AI Assistant" rename + agent feedback UI
- Delete client UI (trash button + confirm modal on `ClientDetail`)
- Agent delete actions (`booking/delete`, `client/delete`) with confirmation cards
- Agent `dob` editing (birthday support in ClientForm prefill + highlighting)
- Smart availability query response (morning/evening breakdown)
- First-available-slot finder (`find_slot`) wired through booking create
- Compound flow: no-match "Create new client" from booking/create resumes into BookingForm
- Voice input: mic button in agent composer (Groq Whisper transcription, silence-detection auto-stop, 15s cap, iOS PWA compatible)
- Feedback prompt extended to 3s; schedule-response bookings are clickable
- **Status on dev:** deployed to `inkbloop-dev.vercel.app`
- **Status on prod:** NOT YET DEPLOYED
- **Action when ready for prod:** merge `dev` → `main`, then `npm run deploy:prod` (or push to main if auto-deploy is wired).

**Prod deploy order:** apply the migrations first (they're already applied — safe), set the `GROQ_API_KEY` secret on prod, then deploy the 4 edge functions (each with `--no-verify-jwt`), then the frontend. The frontend is the last step so users only see new UI once the backend can serve it.

---

## Standard playbooks

### Apply a new migration to dev
```
npx supabase link --project-ref kshwkljbhbwyqumnxuzu
npx supabase db push --linked
npx supabase link --project-ref jpjvexfldouobiiczhax   # relink back to prod
```

### Apply a new migration to prod
Same as dev, but use prod project ref. Double-check the migration is non-breaking and has been exercised on dev first.
```
npx supabase link --project-ref jpjvexfldouobiiczhax   # already linked by default
npx supabase db push --linked
```

### Deploy an edge function
```
npx supabase functions deploy <name> --project-ref <dev_or_prod_ref> --no-verify-jwt
```
Docker is not required (CLI falls back to bundling locally).

**ALWAYS pass `--no-verify-jwt`.** The `verify_jwt` setting is reset on every deploy (it does not inherit from the prior version), defaulting to `true`. This project uses ES256-signed user tokens, which the gateway verifier cannot handle — leaving verify_jwt on causes every call to return `HTTP 401 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM` before the function code even runs. Each function authenticates internally via `supabase.auth.getUser()`, so disabling gateway verification is safe. Same rule when deploying via the `mcp__supabase__deploy_edge_function` tool — pass `verify_jwt: false`.

### Deploy frontend
- Dev: `npm run deploy:dev` → aliased to `inkbloop-dev.vercel.app`
- Prod: `npm run deploy:prod`

---

## Known caveats

- **Migration history drift:** The dev project's `supabase_migrations.schema_migrations` was empty until recently. If you link a new environment and `db push` wants to re-apply old migrations, use:
  ```
  npx supabase migration repair --linked --status applied 00001 00002 ... 00012
  ```
  to mark pre-existing migrations as applied without re-running them.

- **MCP is prod-only.** Any `mcp__supabase__*` call targets prod. For dev, use the CLI.

- **Ordering:** when shipping a change that touches both DB and code (like `Cover Up`), apply the DB migration **before** the frontend deploy so users don't hit "check constraint violation" errors during the window where the frontend can emit a new value that the DB rejects.
