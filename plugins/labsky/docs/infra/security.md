# Security

> Read when handling a secret, a token, authentication, personal data, HTTP headers or CORS, or when writing a CI workflow.

Source: `labsky-studios/ciudad-ilamapa`, 2026, unless a section is marked **Proposed**. For the frontend's own rules (tokens in the browser, reCAPTCHA), see `docs/never/no-go-list.md` → Authentication and Integrations.

---

## Where each secret lives

| Secret | Lives in | Set by |
|---|---|---|
| A Worker's runtime secret (`PAYLOAD_SECRET`, `CMS_API_KEY`) | Cloudflare, as a Worker secret | A human, `wrangler secret put <NAME> [-e staging]` |
| A CI credential (`CLOUDFLARE_API_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, the merge bot's token) | GitHub Actions secrets | A human, `gh secret set` |
| A local development value | `.env`, `.env.local` or `.dev.vars`, never committed | The developer |

- **Every variable is documented in `.env.example`** with what it is for, whether it is optional and where its deployed value lives. The value itself is never there.
- **A build-only placeholder** is allowed when a tool demands a secret at build time but the deployed Worker reads its own (`PAYLOAD_SECRET: build-only` in CI), with a comment saying so.
- **Public is not secret**: a public URL or an account id goes in `vars` or the config file, not in secrets, so the config documents itself.
- A secret that was ever committed, pasted in a chat or printed in a log is rotated, not just deleted.

---

## Tokens with the least privilege

- Each CI token has only the scopes its workflow needs, **listed in a comment at the top of that workflow** (for example "Workers Scripts: Edit, D1: Edit, Workers R2 Storage: Edit on the Ciudad Ilamapa account").
- Service users (a site reading its CMS) get a role that can do exactly what the service needs (`docs/backend/payload.md` → Roles and access) and an API key, never a person's credentials.
- Scripts that reach an environment behind Access use a dedicated service token, not a person's session.

---

## Server-only keys

- A key that grants access to data is read only on the server (`src/config/server-env.ts`), sent only from server functions, and never carries `VITE_`.
- The client bundle never contains an API key, a token, or a URL that only works with one.

---

## Authentication surfaces

- Admin panels: lockout after 5 wrong passwords for 10 minutes, written explicitly; roles with least privilege; long unique passwords; staging panels behind Access.
- Disable what is not used: GraphQL off in Payload, no `workers.dev`, no preview URLs.
- Error messages never reveal whether an account exists.

---

## Personal data

See `docs/backend/data-and-migrations.md` → Personal data. In short: collect the minimum, restrict reads by role, never log it, never send it to analytics, never put it in seeds or fixtures.

---

## GitHub Actions

- Set `permissions:` on every workflow to the minimum it needs (`contents: read` by default; `pull-requests: write` only where it comments).
- Pin third-party actions to a major version tag at least (`@v4`) and prefer official actions (`actions/*`, `cloudflare/*`, `anthropics/*`, `pnpm/*`).
- Never echo a secret, and never pass one to a step that runs code from a fork. Do not use `pull_request_target` with a checkout of the PR's code.
- Deploy jobs run only on pushes to `staging` and `main` (or a manual dispatch), never on a PR from a fork.

---

## Headers and CORS (**Proposed**)

- Long-lived caching only for content-hashed files (`/_next/static/*`, `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`). This part is practiced in `ciudad-ilamapa`'s CMS (`public/_headers`).
- Every HTML response sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY` (or a `frame-ancestors` CSP), set in `_headers` or the Worker.
- CORS stays closed unless a browser on another origin must call the API; then it names the origins.
