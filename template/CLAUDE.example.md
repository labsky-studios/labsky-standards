# CLAUDE.md — Seguro Vehiculo

> Base rules come from the Labsky standard (plugin `labsky@labsky`, repo `labsky-studios/labsky-standards`), enabled in `.claude/settings.json`.
> This file contains only what makes this project different — no need to repeat base rules here.

---

## Project identity

- **App:** Seguro Vehiculo
- **Purpose:** Online quoting and purchase flow for vehicle insurance products
- **Audience:** End customers purchasing insurance through the broker's web portal
- **Repo:** https://github.com/acme/seguro-vehiculo

---

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` |
| Test | `pnpm test` |
| Lint / format | `pnpm lint` |
| Build | `pnpm build` |

---

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Runtime | Node 20 |
| Framework | React 18 + Vite + TanStack Router |
| Styling | Tailwind CSS v4 + CVA |
| Testing | Vitest + Testing Library |

---

## Overrides

- **No Axios** — this project uses native `fetch` wrapped in a thin typed helper at
  `src/lib/http.lib.ts`. Do not introduce Axios. The `docs/frontend/api-layer.md` Axios
  rules do not apply; use the patterns in `docs/local/api-layer.md` instead.

---

## Local rules

- See `docs/local/api-layer.md` for the `fetch`-based HTTP conventions used in this project.
- See `docs/local/quote-flow.md` for step orchestration — the multi-step quote flow has
  non-obvious state transitions that diverge from the standard store pattern.

---

## Agent notes

- Env vars are in `.env.local` (never committed). The required keys are documented in
  `.env.example` at the repo root.
- The `src/features/quote/stores/quote.store.ts` store is the single source of truth for
  the entire quote flow. Do not duplicate quote state in component-local state.
- The backend returns `camelCase` — no transformation layer needed.
- E2E tests in `tests/e2e/` require a running dev server (`pnpm dev`) before running
  `pnpm test:e2e`.

---

## Escalation

If completing a task requires violating a rule in this file or in the base docs,
stop and report to a human before proceeding.
