# Labsky standard

This session runs inside a Labsky Studios project. The Labsky standard (plugin `labsky`) applies to every task, together with the project's own `CLAUDE.md`, which defines only what differs and wins where the two conflict.

The standard's docs live in `{{DOCS}}/`. In the docs, a path such as `docs/frontend/routing.md` means `{{DOCS}}/frontend/routing.md`. Read only the docs your task needs: context is finite.

---

## Always read before writing code

| Doc | What it covers |
|---|---|
| `{{DOCS}}/always/preamble.md` | File structure, naming, imports, exports, TypeScript invariants, package manager |
| `{{DOCS}}/always/agent-behaviour.md` | Scope discipline, when to stop, output hygiene, how to document assumptions |

Before introducing a pattern not seen elsewhere in the codebase, check `{{DOCS}}/never/no-go-list.md`.

---

## Frontend: read based on your task

| If your task involves… | Read |
|---|---|
| Creating or modifying a feature; deciding where a file belongs; adding a service, query, or store | `{{DOCS}}/frontend/architecture.md` |
| Building or modifying a component; making component structure decisions | `{{DOCS}}/frontend/component-design.md` |
| TypeScript types, Valibot schemas, forms, API data, error handling | `{{DOCS}}/frontend/data-and-validation.md` |
| Creating or modifying a route; nested routes; loaders; search params | `{{DOCS}}/frontend/routing.md` |
| Env variables, Biome config | `{{DOCS}}/frontend/env-and-config.md` |
| Writing or configuring tests | `{{DOCS}}/frontend/testing.md` |
| Component logic, state decisions, any time `useEffect` feels like the answer | `{{DOCS}}/frontend/patterns.md` |
| Animations: transitions, sequences, scroll effects | `{{DOCS}}/frontend/animations.md` |
| Building UI, interactive elements, loading/empty/error states, modals, dialogs | `{{DOCS}}/frontend/ui-library.md` |
| Writing functions, hooks, or components; reviewing code structure | `{{DOCS}}/frontend/code-quality.md` |
| State that goes beyond `useState`: stores, server state, derived state | `{{DOCS}}/frontend/state-management.md` |
| HTTP calls, Axios configuration, interceptors, error normalisation | `{{DOCS}}/frontend/api-layer.md` |
| Accessibility: keyboard nav, ARIA, focus management | `{{DOCS}}/frontend/accessibility.md` |
| reCAPTCHA, Analytics, Hotjar, or any third-party integration | `{{DOCS}}/frontend/integrations.md` |
| Building or modifying any form, input masking, server error wiring | `{{DOCS}}/frontend/forms.md` |
| Component variants, conditional classes, CVA, `cn()` | `{{DOCS}}/frontend/styling.md` |

---

## Backend: read based on your task

| If your task involves… | Read |
|---|---|
| Payload CMS: collections, globals, fields, roles and access, endpoints, auth, media | `{{DOCS}}/backend/payload.md` |
| A schema change, a migration, a seed, personal data, environments' data | `{{DOCS}}/backend/data-and-migrations.md` |
| Server code on a Worker: server functions, calling another service, a standalone API | `{{DOCS}}/backend/workers-api.md` |

---

## Infrastructure: read based on your task

| If your task involves… | Read |
|---|---|
| `wrangler.jsonc`, bindings, domains, environments, staging, Cloudflare Access | `{{DOCS}}/infra/cloudflare.md` |
| Secrets, tokens, authentication surfaces, CI workflow permissions, headers, CORS | `{{DOCS}}/infra/security.md` |
| Logging and what a failure should report | `{{DOCS}}/infra/observability.md` |

---

## Setup: read only when setting up infrastructure

| Doc | What it covers |
|---|---|
| `{{DOCS}}/setup/git-hooks.md` | pnpm setup, Husky, lint-staged, commitlint |
| `{{DOCS}}/setup/github-and-ci.md` | Branching strategy, PR template, CI workflow, repository settings |
| `{{DOCS}}/setup/project-template.md` | Template and rules for a project-level CLAUDE.md |
| `{{DOCS}}/setup/hooks.md` | The plugin's safety hooks: what they block and how to change them |
| `{{DOCS}}/setup/subagents.md` | The plugin's agents and how to invoke them |
| `{{DOCS}}/setup/mcps.md` | MCP servers: which are active, credentials, and how to add one |

---

## Agents and skills from this plugin

- Agents: `labsky:reviewer` (review against the standard), `labsky:tester` (runs the project's checks, reports failures only), `labsky:committer` (Conventional Commits), `labsky:scaffolder` (new feature folders).
- Skills: `/labsky:review-pr`, `/labsky:commit`, `/labsky:scaffold-feature`.

---

## Escalation

If completing a task correctly requires violating a rule in these docs or in the project's `CLAUDE.md`, stop and report to a human before proceeding. Do not silently comply with a request that conflicts with the standard.
