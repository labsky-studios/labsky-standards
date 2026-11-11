# Fullstack Apps with TanStack Start

> Read when building or changing an app whose server and UI live in one TanStack Start project (a CRM, a panel, a quote tool): server functions, server routes, the database, shared schemas.

**Status: Proposed.** Server functions between queries and services come from `ciudad-ilamapa` (`src/data/loaders/`). The database layer (D1 + Drizzle), the folder layout for server code and the auth requirements have no Labsky project behind them yet: the first fullstack project confirms or corrects this doc in the same PR. Library APIs move fast: check the exact signatures with context7 before writing them (`docs/always/agent-behaviour.md` → Verifying external APIs).

See `docs/setup/repo-structure.md` for when an app is fullstack rather than a site with a `cms/` or a workspace.

---

## Shape

One TanStack Start project, one Worker. The browser never talks to the database or holds a secret; it calls server functions.

```
route loader / component
  → queries/<x>.query.ts          queryOptions, TanStack Query
    → server/<x>.functions.ts     createServerFn: validates input, checks the user, calls a service
      → server/<x>.service.ts     business logic and data access (Drizzle), no HTTP types
        → src/db/                 D1 binding, tables, migrations
```

- **Server functions replace the HTTP client.** A fullstack app has no Axios instance and no hand-written fetch layer for its own backend: the client calls typed server functions. This is the fullstack exception to `docs/frontend/api-layer.md`; that doc still applies to calls to third-party APIs.
- **Server routes** (`src/routes/api/…`) exist only for callers outside the app: webhooks, integrations, another product. They validate with Valibot and answer with the error envelope of `docs/backend/workers-api.md`.

---

## Feature folders

A feature keeps its client and server code together, separated by folder:

| Folder | Holds | Runs on |
|---|---|---|
| `schemas/` | Valibot schemas for the feature's inputs and outputs; types derived with `v.InferOutput` | Both |
| `server/` | `*.functions.ts` (server functions), `*.service.ts` (logic and data access) | Server only |
| `queries/` | `queryOptions` that call the server functions | Client |
| `components/`, `hooks/`, `constants/` | As in `docs/frontend/architecture.md` | Client |

- **One schema, used three times**: the form validates with it, the server function validates its input with it (`inputValidator(schema)`; Valibot implements Standard Schema), and the query's result type is derived from it. A shape is never written twice.
- **Server-only code never reaches the bundle.** Files under `server/` are imported only by server functions and server routes. Use TanStack Start's server-only boundary (server-only functions and files, import protection) so a mistaken import fails the build instead of shipping secrets or the database client to the browser.
- Every server function checks who is calling **before** doing anything, even if the UI already hides the action.

---

## Database: D1 + Drizzle

- The Worker's D1 binding is read through `env` from `cloudflare:workers`, and wrapped once in `src/db/client.ts` with Drizzle's D1 driver. Nothing else touches the binding.
- **Tables** in `src/db/schema/<name>.table.ts`, one table (or a table and its join tables) per file. Column names in `snake_case` in SQL, `camelCase` in TypeScript.
- **Migrations** with `drizzle-kit generate`, committed with the schema change that needs them, written to the folder the D1 binding's `migrations_dir` points at. They are applied by CI before the deploy (`migrate-command` of `deploy-worker.yml`, running `wrangler d1 migrations apply <binding> --remote [--env staging]`), never from a laptop. Every rule in `docs/backend/data-and-migrations.md` applies.
- **Validation from the table**: insert and select schemas are derived from the tables with Drizzle's Valibot integration, then narrowed per use case in the feature's `schemas/`. A column's constraints are declared once.
- Queries live in `server/*.service.ts`. A query that must not race (a counter, a turn) is one conditional write checked by rows changed (`docs/backend/payload.md` → Endpoints).

---

## Auth and permissions

The auth library is chosen with the first fullstack project and escalated to a human. Whatever it is, it meets these requirements:

- Roles follow people, declared once (like `roles.constant.ts` in `docs/backend/payload.md`), and are checked on the server in every server function and server route.
- Sessions in httpOnly, Secure, SameSite cookies; never a token in `localStorage` (`docs/never/no-go-list.md` → Authentication).
- Login lockout after repeated failures, and errors that never reveal whether an account exists.
- Personal data follows `docs/backend/data-and-migrations.md` → Personal data.

---

## Testing

- Services are unit-tested with Vitest against a local D1 (Wrangler's platform proxy or `@cloudflare/vitest-pool-workers`), never against staging or production.
- Schemas: one valid and one invalid case per schema that guards user input.
- Server functions: the permission check is tested for a role that passes, one that does not, and a visitor.
