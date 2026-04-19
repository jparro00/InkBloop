# Setup

Get Ink Bloop running locally.

## Prerequisites

- Node 20+ and npm
- Supabase CLI (`npm i -g supabase`)
- A Supabase project (dev) — credentials live in `.env`

## First-time setup

```bash
git clone git@github.com:jparro00/InkBloop.git
cd InkBloop   # local dir is named InkFlow for legacy reasons
npm install
cp .env.example .env
# fill in .env with dev Supabase URL + anon key
```

## `.env` variables

```
VITE_SUPABASE_URL=https://<dev-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key>
VITE_META_API_URL=<optional: override simulator base for send flow>

# Eval runner (npm run eval)
EVAL_EMAIL=<your-login-email>
EVAL_PASSWORD=<your-login-password>
```

Never commit `.env` — it's gitignored. `.env.example` is the template.

## Dev loop

```bash
npm run dev     # vite on :5173
npm run sim     # simulator (Express + WS on :3001)
```

The frontend reads Supabase creds from `.env` at build time. The simulator has a runtime env switcher in its UI — you can toggle between prod and dev Supabase without restarting.

## Linking to Supabase

The CLI starts out pointing at prod. For dev work:

```bash
npx supabase link --project-ref <dev-ref>
# ...do dev work...
npx supabase link --project-ref <prod-ref>   # relink back
```

See [deployment.md](./deployment.md) for project refs and migration/edge-function deploy steps.

## Running evals

```bash
npm run eval             # all agents
npm run eval:booking     # booking agent only
npm run eval:client
npm run eval:schedule
npm run eval:messaging
```

Requires `EVAL_EMAIL` + `EVAL_PASSWORD` in `.env`. Results drop into `evals/results/` (gitignored).

## Build + lint

```bash
npm run lint    # eslint
npm run build   # tsc -b && vite build → dist/
```

## Related docs

- [deployment.md](./deployment.md) — project refs, deploy commands, pending prod changes
- [simulator.md](./simulator.md) — what the simulator does and how it integrates
- [supabase.md](./supabase.md) — schema, migrations, edge functions
