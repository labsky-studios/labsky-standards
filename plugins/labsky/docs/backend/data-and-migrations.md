# Data and Migrations

> Read when changing a database schema, writing a migration or a seed, handling personal data, or touching how environments keep their data apart.

Source: `labsky-studios/ciudad-ilamapa` (Payload 3 on D1), 2026, unless a section is marked **Proposed**.

---

## Migrations

- **Every schema change ships with its migration, in the same PR.** For Payload: `pnpm --dir cms exec payload migrate:create <name>`, which writes the `.ts` migration, its `.json` snapshot and updates `migrations/index.ts`. Commit all three.
- **Name it after the change**, in kebab-case: `media-prefix`, `partner-band-labels`.
- **A migration is immutable once it exists on `dev`.** It may already have run somewhere. To change it, write a new migration. The plugin's pre-write hook blocks edits to existing files under `migrations/`: a migration that has not yet left your branch is fixed by deleting it (with its snapshot and its line in `migrations/index.ts`) and creating it again with the CLI.
- **Write `down` too**, and make it the exact inverse of `up`. A `down` that cannot be written (data loss) says so in a comment and throws.
- **Prefer additive changes**: add a column with a default, backfill, then remove the old column in a later migration once nothing reads it. A column rename is a new column plus a backfill.
- **Review the generated SQL** before committing. Generated migrations can drop and recreate a table; on D1 that loses its data.

---

## Deploy order

Migrations run **before** the code that needs them, in CI, never from a developer's machine:

1. Apply pending migrations to the target environment's database (`payload migrate` against the remote D1, with `NODE_ENV=production` and the environment's `CLOUDFLARE_ENV`).
2. Run `PRAGMA optimize` on the database.
3. Deploy the Worker.

The project's `deploy` and `deploy:staging` scripts encode that order (`deploy:database` then `deploy:app`), and the CMS workflow calls them. A deploy with migrations never runs concurrently with another for the same branch (`concurrency` without `cancel-in-progress`).

Because the old code keeps serving until the new Worker is live, every migration must be compatible with the code currently deployed. That is why changes are additive.

---

## Environments keep their data apart

- **Staging has its own database, users, test records and bucket prefix.** Nothing a test does reaches production: test leads, test advisors, test rotation turns all live in staging's database.
- **Production data never flows to staging or local.** Debug with staging data or synthetic data.
- **Local development** uses local D1 and R2 stand-ins (Wrangler's platform proxy). Remote bindings are reached only by CI and, for a production migration, by the Payload CLI in CI.

---

## Seeds

A seed loads content into a fresh or local CMS (staging included). It:

- **Writes content only**: pages, sections, entries, images. Never contacts, leads, users with real data, or anything personal.
- **Is idempotent and never overwrites an editor's work**: a published section or page is left alone, an entry whose slug exists is skipped, an image already uploaded (same file name) is reused.
- **Signs in as a `labsky` user** with credentials from the environment, and reaches a deployed CMS behind Cloudflare Access with a service token (`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`).
- Documents at the top of the file how to run it and what it does not load.

---

## Personal data

Names, phones, emails and anything that identifies a person:

- **Collect the minimum** the business needs, and record consent when the person gives it (`consent` checkbox with the timestamp of the record).
- **Access is restricted by role** (`docs/backend/payload.md` → Roles and access): read by those who follow up, written by the collecting service only, never edited, deleted only by Labsky.
- **Never logged, never sent to analytics, never copied into fixtures or seeds.** Log an identifier or a count instead.
- **Normalized copies for matching** (digits-only phone) are hidden from the panel and indexed.

---

## Integrity

- **Uniqueness** lives both in the database (`unique` column) and in validation, so users get a readable message (`docs/backend/payload.md` → Fields).
- **Concurrent writes** that must not collide use a conditional write checked by rows changed, with bounded retries (`docs/backend/payload.md` → Endpoints).
- Records of what happened (contacts, logs of exits) are append-only: `update: nobody`.

---

## Backups and recovery (**Proposed**)

- D1 keeps 30 days of point-in-time history (Time Travel). Before a risky migration, CI or the human running it records the current bookmark (`wrangler d1 time-travel info <db>`), so a restore has a known target.
- A restore (`wrangler d1 time-travel restore`) is a human action, announced to the client, and followed by redeploying the code that matches the restored schema.
