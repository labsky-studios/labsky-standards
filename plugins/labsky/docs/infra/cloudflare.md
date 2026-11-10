# Cloudflare

> Read when creating or changing a Worker, its `wrangler.jsonc`, its bindings, domains or environments, or Cloudflare Access.

Source: `labsky-studios/ciudad-ilamapa` (site and CMS Workers), 2026, unless a section is marked **Proposed**.

---

## Accounts

- Each client's projects live in **the client's own Cloudflare account** (for example "Ciudad Ilamapa"), with Labsky as a member.
- **`account_id` is pinned in `wrangler.jsonc`**, so every Wrangler command targets that account whoever is logged in. It is not a secret.

---

## `wrangler.jsonc`

- Comment every non-obvious entry: why this route, why this flag, what a binding is for. The file is the deploy's documentation.
- **The top level is production. Staging is `env.staging`.** Deploy staging with `-e staging` (or `CLOUDFLARE_ENV=staging` at build time for the Vite plugin).
- **Bindings and `vars` are not inherited by an environment**: repeat every one of them under `env.staging`, pointing at staging's own resources.
- **`vars` hold public values only** (a public URL, a bucket's public origin). Secrets are Worker secrets (`docs/infra/security.md`).
- `"observability": { "enabled": true }` on every Worker (`docs/infra/observability.md`).
- `compatibility_date` is set when the Worker is created and moved forward deliberately, in its own PR. `nodejs_compat` only where a dependency needs Node APIs.
- After editing bindings, regenerate the binding types (`wrangler types`, the project's `cf-typegen` script) and commit them. The generated file is never edited by hand.

---

## Domains and exposure

- **`"workers_dev": false` and `"preview_urls": false` on every Worker and environment.** A `workers.dev` address or a version URL is a door that skips Cloudflare Access and the custom domain's rules.
- Production is served on the client's domain. Use a **custom domain** (`"custom_domain": true`) for a host the Worker owns outright (`cms.`, `dev.`), and a **route** (`zone_name`) when traffic must switch over without a gap, such as moving an apex domain from another host: the route takes effect when the record is proxied.
- Redirects such as `www` → apex are Cloudflare redirect rules, not Worker code.

---

## Staging

- Staging runs on its own subdomain (`dev.<domain>`, `cms-dev.<domain>`), with **its own Workers, database, users and test data** (`docs/backend/data-and-migrations.md`). The staging site talks only to the staging CMS.
- **Staging sits behind Cloudflare Access** (Zero Trust Free): people get in by email One-time PIN, listed in each application's policy; scripts get in with a service token (`CF-Access-Client-Id` and `CF-Access-Client-Secret` headers).
- **Staging is never indexed**: the build only allows indexing when the CI builds `main` (`VITE_ALLOW_INDEXING=true`). Without it, every page carries `noindex, nofollow`, `robots.txt` (a server route, never a static file) disallows everything and the sitemap is a 404.
- **Previews per PR exist only behind Access.** No public preview URL ever shows unreleased content.

---

## Production CMS and admin panels

- A production admin panel that the client's editors use may stay outside Access, when its own login, lockout and roles guard it (`docs/backend/payload.md` → Authentication). That choice is written in the project's `CLAUDE.md`.
- Every other admin surface is behind Access.

---

## Workers talking to each other

- **Service Bindings** (`"services": [{ "binding": "CMS", "service": "<worker-name>" }]`) connect a site to its CMS or API, Worker to Worker. They do not pass through Access and need no public route.
- Staging binds to staging's services, production to production's.

---

## Storage

- **D1** for relational data, one database per environment, `"remote": true` on the binding so the CLI targets the real one when asked.
- **R2** for files. One bucket may serve both environments with a prefix per environment (`staging/`), never mixed keys. Public files are served from the bucket's own custom domain (`media.<domain>`), where Cloudflare can resize images.

---

## Static sites (**Proposed**)

A fully prerendered site (no server functions) deploys as a Worker with **static assets** rather than Cloudflare Pages, so it shares the same `wrangler.jsonc` model, environments and deploy workflow as the rest:

```jsonc
{
	"name": "<project>",
	"account_id": "<account>",
	"compatibility_date": "<date>",
	"assets": { "directory": "./dist/client", "not_found_handling": "404-page" },
	"workers_dev": false,
	"preview_urls": false,
	"observability": { "enabled": true },
	"env": { "staging": { "name": "<project>-staging" } }
}
```

---

## Who runs what

| Action | Who |
|---|---|
| Deploy a Worker, apply remote migrations | CI only (`docs/setup/github-and-ci.md`) |
| Set or rotate a Worker secret | A human, with `wrangler secret put` |
| Create databases, buckets, Access applications, DNS records | A human, documented in the project's `CLAUDE.md` |
| Upload large media (videos) to R2 | A human |
| Read logs (`wrangler tail`, dashboard) | Anyone |

The plugin's pre-bash hook blocks agents from deploying, touching remote data, and managing secrets.
