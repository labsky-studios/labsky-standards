# Payload CMS

> Read when creating or modifying anything in a Payload CMS: collections, globals, fields, access, endpoints, auth or its config. For schema changes also read `docs/backend/data-and-migrations.md`; for its Worker, `docs/infra/cloudflare.md`.

Source: `labsky-studios/ciudad-ilamapa` (`cms/`, Payload 3 on Cloudflare Workers with D1 and R2), 2026. A project on another CMS lists it in its `CLAUDE.md` as an override.

---

## Layout

The CMS is a package of its own (`cms/`, with its own `package.json`, lockfile and `.env.example`), installed with `pnpm --dir cms install`. Its code follows the preamble's naming (`kebab-case.<type>.ts`, `@/` imports) with these types:

| Folder | Suffix | Holds |
|---|---|---|
| `collections/` | `.collection.ts` | One `CollectionConfig` per file (or a closely related pair, such as leads and WhatsApp exits) |
| `globals/` | `.global.ts` | Singleton documents: pages, settings, a rotation's state |
| `sections/` | `.section.ts` | The field groups a page global is made of, one per page section |
| `fields/` | `.field.ts` | Reusable field builders and validators |
| `access/` | `.access.ts` | Every access function |
| `constants/` | `.constant.ts` | Roles and shared option lists |
| `endpoints/` | `.endpoint.ts` | Custom REST endpoints |
| `config/` | `env.ts` | The validated environment |
| `lib/` | `.lib.ts` | Platform glue (the Cloudflare bindings) |
| `utils/` | `.util.ts` | Pure logic, unit-tested |
| `migrations/` | generated | See `docs/backend/data-and-migrations.md` |
| `tests/` | `.test.ts` | Vitest |

`payload.config.ts` keeps Payload's **default export**: Payload and Next load it by that contract. It is the one exception to the named-exports rule, together with the files Payload generates under `app/`. Generated files (`payload-types.ts`, `app/(payload)/admin/importMap.js`, `migrations/`) are excluded from Biome and never edited by hand.

---

## Config

- **`graphQL: { disable: true }`** unless a consumer needs it. Every API surface is attack surface.
- **`i18n`** in the editors' language (`es`, with `es` as fallback). Labels, admin descriptions and validation messages are written in that language too: the panel is for the client's editors.
- **`typescript.outputFile`** points at `payload-types.ts`; regenerate with the project's `generate:types` script after any schema change.
- **Logger on Workers**: Payload's default pretty logger needs `fs`, which a Worker lacks. In production, send its lines to `console.log`, which Cloudflare's logs collect (`docs/infra/observability.md`). Say so in a comment, so nobody removes it as a debug statement.
- **`secret`** comes from `config/env.ts`, never from `process.env` inline.

---

## Roles and access

Roles follow **people**, not screens. Declare them once in `constants/roles.constant.ts`, with a doc comment that says who holds each and what for:

```ts
export const ROLES = [
	{ label: "Labsky", value: "labsky" },        // everything, users included
	{ label: "Cliente", value: "client" },       // edits the content, reads contacts
	{ label: "Bitácora", value: "log-writer" },  // its own entries only
	{ label: "Sitio (servicio)", value: "site" },// the website, by API key; never opens the panel
] as const;

export type TRole = (typeof ROLES)[number]["value"];
```

Access functions live in `access/roles.access.ts`, are built on one `hasRole(user, ...roles)` helper, and are **named by audience** (`editors`, `contactReaders`, `siteOnly`, `nobody`), so a collection reads as a policy:

```ts
const CONTACT_ACCESS: CollectionConfig["access"] = {
	read: contactReaders,   // labsky, client, site
	create: siteOnly,       // written by the site's server alone
	update: nobody,         // a contact is a record of what happened
	delete: labskyOnly,
};
```

Rules:

- **Every collection sets `read`, `create`, `update` and `delete` explicitly.** Payload's default (any signed-in user) is never relied on.
- **Personal data** (leads, contacts, anything with a name, phone or email) is read only by the roles that must follow it up, written only by the service that collects it, never updated, and deleted only by `labsky`. A new role never gets read access to it.
- **Drafts**: visitors read only published documents, even when they ask for `?draft=true`: `hasRole(...) || { _status: { equals: "published" } }`.
- **`admin.hidden`** only declutters the menu (`hiddenUnless(...)`); it never grants or denies data. What a role may read is decided by `access`.
- **A user's own role** is guarded with field-level access (`labskyOnlyField` on `create` and `update`): anyone may edit their own account, never their own role.
- **Unit-test every access function** with Vitest (`tests/roles.access.test.ts`): a role that passes, one that does not, and a visitor who is not signed in.

---

## Authentication

- **People** sign in with email and password. Write the lockout explicitly, even when it equals Payload's default, so nobody lowers it unknowingly: `auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 }`.
- **Services** (the website) are users with their own role and an API key: `auth: { useAPIKey: true }`. The key is a Worker secret of the consuming service, sent as `Authorization: users API-Key <key>`, and only ever read on its server.
- **`saveToJWT: true`** on the role field, so access checks do not hit the database.
- **The first user** is created from the panel's sign-up screen before any role exists. A `beforeChange` hook gives it `labsky`; every later user is created by `labsky`.
- A panel open to the internet relies on the lockout, the roles and long unique passwords. Staging panels sit behind Cloudflare Access (`docs/infra/cloudflare.md`).

---

## Fields

- **Repeated shapes become builders** in `fields/*.field.ts` (`lineField`, `paragraphField`, `pictureField`, `videoField`), required unless told otherwise, so each section shows only the fields that differ.
- **Uniqueness is enforced twice**: `unique: true` on the column, and a `validate` that counts clashes (`uniqueIn(collection, field, message)`). D1 reports a unique-constraint clash in a shape Payload does not map to the field, so without the check the editor gets a server error instead of a message.
- **Validation messages are user-facing prose** in the editors' language, and say how to fix the value.
- **Hidden technical fields** (a normalized phone used for matching) carry `admin.hidden` and an `admin.description` that explains why they exist.
- Index the columns the site filters by (`index: true`).

---

## Endpoints

Custom endpoints live in `endpoints/*.endpoint.ts`, one per file, registered in `payload.config.ts`.

- **Check the role first** and answer `403` before doing anything: `if (!hasRole(req.user, "site", "labsky")) return Response.json({ error: "forbidden" }, { status: 403 });`
- Answer with `Response.json(...)` and an explicit status.
- Use the Local API (`req.payload.find`, `count`, `updateGlobal`) with `req` passed through. Use `overrideAccess: true` only for a write the endpoint has already authorized, with a comment saying so.
- **Concurrent writes** that must not collide (taking a turn, a counter) use one conditional SQL write on the binding (`UPDATE … WHERE id = ? AND last_order IS ?`), checked through `meta.changes`, with a bounded retry and a short random back-off. Payload's update has no condition. The doc comment explains the race and why it uses SQL.
- Pure decision logic (whose turn is next) goes in `utils/` and is unit-tested.

---

## Environment

`config/env.ts` is the only file that reads `process.env`. It parses everything once with Valibot at startup, so a missing secret fails loudly there instead of as an unsigned session later:

```ts
export const env = v.parse(envSchema, {
	isProduction: process.env.NODE_ENV === "production",
	payloadSecret: process.env.PAYLOAD_SECRET,
	mediaUrl: process.env.MEDIA_URL || undefined,
});
```

Every variable is documented in `cms/.env.example` with what it does, whether it is optional, and where its deployed value lives (a Worker secret or a `vars` entry in `wrangler.jsonc`).

---

## Media

- Images upload through the panel to R2 (`@payloadcms/storage-r2`). With the bucket's public domain configured, image URLs point straight at R2 (`disablePayloadAccessControl: true`), so files skip the Worker on the way out; locally, Payload serves them.
- **One schema across environments**: each environment's uploads go under its own prefix (`MEDIA_PREFIX=staging`), and the plugin sets `alwaysInsertFields: true` so the `prefix` column exists everywhere and one set of migrations serves all.
- Large files that are few (videos) do not go through the panel: a human uploads them to the bucket and the CMS stores only their address, validated by a field builder.

---

## Patches and upgrades

- A dependency patch lives in `cms/patches/`, is listed in `pnpm-workspace.yaml` (`patchedDependencies`), and is documented in the project's `CLAUDE.md` with **why** and **when to drop it** (for example: the release that adds the option the patch emulates).
- Upgrading Payload means re-checking every patch still applies, regenerating types and import map, and creating a migration if the schema moved. All Payload packages move together, pinned to the same exact version.

---

## Known gotchas (Payload 3.92 on Workers)

- **Password hashing**: Workers allow at most 100 000 PBKDF2 iterations; Payload 3.92 uses more, so no user can be created without a patch. Keep the patch until `auth.passwordHashIterations` exists, then set it to `100000`.
- **First user on a fresh deployment**: Payload caches each collection's field map in the Worker's memory, and the create-first-user screen fills `users` with a different field set. Redeploy after creating the first user, or Usuarios → Crear renders blank until the isolate restarts.
