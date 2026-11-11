# Observability

> Read when adding logging to server code, deciding what a failure should report, or configuring a Worker's logs.

Source: `labsky-studios/ciudad-ilamapa`, 2026, unless a section is marked **Proposed**.

---

## Logs on Workers

- `"observability": { "enabled": true }` in every Worker's `wrangler.jsonc`. Cloudflare keeps the Worker's console output and invocation logs, readable in the dashboard or live with `wrangler tail`.
- **On a Worker, the console is the log sink.** Server-side `console.error` and `console.warn` are legitimate and stay in the code; the "no `console.log`" rule in `docs/always/agent-behaviour.md` is about debug leftovers. Payload's logger is pointed at `console.log` in production for the same reason (`docs/backend/payload.md` → Config).
- The log level is configuration (`PAYLOAD_LOG_LEVEL`, default `info`), not code.

---

## What to log

- **Every fallback and every degraded answer, with its reason.** A site that quietly serves stale or fallback content is a bug nobody finds. Example: `[landing] CMS unavailable, serving the last good copy`, with the error attached.
- **Validation failures in a readable shape**: flatten Valibot issues (`v.flatten(error.issues)`) instead of dumping the error object.
- **Prefix each line with the area** in brackets (`[landing]`, `[rotation]`), so the dashboard can filter by it.
- Unexpected errors with their cause, at the point where they are handled, once.

---

## What never to log

- Personal data: names, phones, emails, message bodies. Log an id or a count.
- Secrets, tokens, API keys, `Authorization` headers, full request bodies of forms.
- Content of an editor's draft.

---

## Alerts (**Proposed**)

- A Worker whose error rate rises is noticed by a human, not by a visitor: set a Cloudflare notification on the Worker's error rate for production, sent to the Labsky team's email.
