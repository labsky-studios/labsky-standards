# Repository Structure

> Reference doc. Read when starting a new product, deciding where backend code goes, or planning a module that touches both the server and the UI.

---

## One repository per product

Every Labsky product lives in one repository, backend and frontend included. A feature that needs data, server logic and UI ships as **one PR**, reviewed and deployed together. Splitting a product across repositories turns every feature into a coordination problem (linked PRs, deploy order across repos, contract drift) that the product does not need.

Inside the repository, the architecture depends on what the product is:

| Product | Architecture | Example |
|---|---|---|
| An app with its own data and one UI (CRM, internal panel, quote tool) | **One TanStack Start fullstack project on one Worker.** Server functions serve its UI; server routes under `src/routes/api/` serve webhooks and outside callers. Data in D1 with Drizzle. See `docs/backend/fullstack-start.md` | The next CRM |
| A content site edited by the client's people | TanStack Start at the root and **Payload in `cms/`**, a package of its own (Payload is a separate Next.js app), connected by a Service Binding. See `docs/backend/payload.md` | `ciudad-ilamapa` |
| An API with several consumers (other products, a mobile app) | **pnpm workspace**: `apps/web`, `apps/api` (its own Worker), `packages/schemas` (the Valibot contract both import) | None yet (**Proposed**) |
| A fully static site | TanStack Start prerendered, served as Worker static assets | `minh-portfolio` |

**Start with the simplest row that fits.** A fullstack app becomes a workspace only when a second consumer actually exists; that move is a planned refactor (`/labsky:plan-feature`), never done in advance "in case".

---

## A module that touches backend and frontend

- **One PR**, with its commits in dependency order so each one builds:
  1. Table or collection + migration.
  2. Server logic: service, server function, endpoint.
  3. The shared Valibot schema (if it is not already part of step 2).
  4. UI: query, components, route.
- **The planner cuts slices across the stack** in the same order (data → server → UI). A slice may span both packages; it may not leave `dev` with a half-wired feature.
- **The contract is the schema.** In a fullstack app, client and server import the same Valibot schema. With a separate `cms/` or `apps/api`, the server's types are generated (Payload's `payload-types.ts`) or shared (`packages/schemas`), and the site still validates every response at its edge.
- **Deploy order** with two packages: the backend deploys first, the site after it. In the project's `deploy.yml`, the site's job has `needs: <backend job>`. Every migration must be compatible with the code currently deployed (`docs/backend/data-and-migrations.md` → Deploy order), so the brief window between the two deploys is safe.

---

## A backend shared by several products (exception)

When one backend must serve products that live in different repositories, it gets its own repository. Then:

- The feature is planned as a parent issue with GitHub sub-issues in each repository (sub-issues work across repositories of the same org).
- The backend PR merges and deploys to staging first. The consumer PR says `Depends on: labsky-studios/<repo>#<n>` and carries the `hold` label until then.
- Changes to the backend's contract are additive; removing a field is a separate, later PR once no consumer reads it.

This is not automated: it has no Labsky case yet. Automate it when the first one exists.

---

## Working on more than one repository

A task that needs two repositories open (the vault and a project, or a shared backend and its consumer) adds the other folder to the session (the desktop app's folder picker, or `claude --add-dir <path>`). To also load that repository's `CLAUDE.md` and rules, set `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` in the session's environment.
