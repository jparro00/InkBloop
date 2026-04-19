# Docs conventions

How this project's documentation stays useful without burning tokens. Read this before adding, splitting, or retiring a doc.

## The 3-tier system

Claude Code's behaviour differs by doc location. Pick the tier that matches what you want to happen.

### Tier 1 — always loaded

- `/CLAUDE.md` at the repo root.
- Loaded into context on every session in this repo.
- Must stay lean. Index + map + gotchas + commands. No feature deep-dives.
- **Target length: under 150 lines.** If it grows past this, move content into Tier 2.

### Tier 2 — on demand

- `/docs/<feature>.md` — read only when explicitly opened.
- One file per feature area (messaging, bookings, clients, agents, supabase, simulator, etc.).
- **Target length: under 400 lines each.** If larger, split or move reference material to `/docs/archive/`.
- Safe to be detailed here — they cost zero tokens when unused.

### Tier 3 — scoped

- `/<subdir>/CLAUDE.md` — auto-loaded ONLY when Claude is working inside that subdirectory.
- Use for rules that apply to a specific tree (e.g. `supabase/CLAUDE.md` for migration etiquette, `.deno` edge function patterns).
- **Target length: under 60 lines.**
- Don't duplicate Tier 2 content — link to the feature doc instead.

## When to add a new feature doc

Create a new `/docs/<feature>.md` when:

- A new feature area is introduced that doesn't fit an existing doc (e.g. a new "inventory" feature).
- An existing doc has grown past ~400 lines AND contains two distinct concerns that can split cleanly.
- A subsystem has more than ~5 files with shared concepts (store + service + edge fns + UI all related).

Append to an existing doc when:

- The work is a variant or extension of an already-documented area.
- The new content is under ~40 lines.
- The concern lives inside an existing section of the doc.

## Feature doc template

Every `/docs/<feature>.md` follows this skeleton so Claude can skim predictable sections. Skip sections that don't apply — don't invent new top-level sections unless truly necessary.

```markdown
# <Feature name>

One-line purpose. What the feature is and who uses it.

## Key files
- `src/stores/<feature>Store.ts` — what it holds, what it persists
- `src/services/<feature>Service.ts` — what it does, which tables/fns it hits
- `src/components/<feature>/` — UI components
- `src/pages/<Feature>.tsx` — page-level entry
- `supabase/functions/<fn>/` — edge functions involved
- `supabase/migrations/<n>_<desc>.sql` — relevant schema

## Data flow
How data moves through the system. One paragraph, optionally a short mermaid or ASCII diagram if the flow is non-obvious.

## Supabase tables
- `<table>` — columns that matter, what they mean
- RLS notes if policies are non-trivial

## Edge functions
- `<fn>` — trigger, response, required env vars, gotchas

## State (stores)
- `<store>` — shape, key actions, persistence notes, realtime subscriptions

## Related docs
- [other-feature.md](./other-feature.md) — how they interact

## Gotchas
- Non-obvious things that have bitten us before
- Constraints that aren't visible in code
```

## Naming

- Lowercase, hyphenated: `image-upload.md`, not `ImageUpload.md` or `IMAGE_UPLOAD.md`.
- Exception: `CONVENTIONS.md` and `CLAUDE.md` stay uppercase (the latter because Claude Code auto-discovers that exact filename).
- Feature docs live flat in `/docs/` — no subdirectories unless we exceed ~10 docs.
- Archive old docs in `/docs/archive/` rather than deleting if the history has value.

## Cross-linking

- Always use relative markdown links: `[bookings](./bookings.md)`.
- From root `/CLAUDE.md`: link as `[bookings](docs/bookings.md)`.
- Cross-link between docs when features interact (e.g. bookings ↔ images ↔ clients).
- When a file moves, search `/docs/` for references and update them.

## Pruning stale docs

When a feature is removed or refactored:

- **Gone**: delete the doc.
- **Changed**: update the doc in the same PR as the code change.
- **Historical value**: move to `/docs/archive/`.
- **Always** update the "Feature docs" table in root `/CLAUDE.md`.

If you notice a doc that contradicts current code, trust the code and fix the doc — don't leave both.

## Commit conventions

- Adding a doc: `docs: add <feature> docs`
- Updating a doc: `docs(<feature>): <what changed>`
- Refactoring the docs system itself: `docs: <what>`

Match the project's general style (lowercase, short, imperative, no trailing period).

## What NOT to document

- Code patterns or formatting — trust ESLint, Prettier, and codebase grep.
- Line-by-line file walkthroughs — Claude can read the file directly.
- Full library API references — use the library's own docs.
- Anything that changes weekly (current sprint, in-flight bugs) — use memory, not docs.
- Obvious things ("React is a framework").

Feature docs capture the **map** — which files matter, how they connect, non-obvious constraints. Documented behaviour belongs in code comments; documented architecture belongs here.
