---
name: decide
description: Record a business, brand, product or content decision of a Labsky client or project in labsky-vault. Use when the user states or confirms such a decision ("from now on…", "we decided…", "the brand never…"), or asks to remember one. Drafts it from the template, shows it, and commits it only after the user approves.
argument-hint: <the decision, in the user's words>
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(git *), Bash(gh api *)
---

Record `$ARGUMENTS` as a decision in `labsky-studios/labsky-vault`. How the vault works is in `${CLAUDE_PLUGIN_ROOT}/docs/setup/project-memory.md`; read it first.

## Steps

1. **Find where it belongs.** The project's `CLAUDE.md` names `**Client:**` and `**Memory:**`. A decision that holds for every project of the client goes in `clients/<client>/decisions/`; one for this project only, in `<Memory>/decisions/`. Ask if it is unclear.
2. **Check it is a decision and not a technical one.** Architecture, libraries and code conventions go in the project repo (`docs/decisions/`) or the standard, not in the vault. Say so and stop.
3. **Read what exists.** The client's and project's `INDEX.md`, and the decision files whose names touch the same subject. If the new decision changes an earlier one, the earlier file gets `Estado: reemplazada por <file>` instead of being deleted.
4. **Draft** `decisions/AAAA-MM-DD-<tema-en-kebab-case>.md` from `templates/decision.md` in the vault, in the client's language:
   - Fecha: today.
   - Contexto, Decisión, Consecuencias: the user's words, tightened, never extended. Anything the user did not say stays out or is marked `pendiente de <cliente>`.
   - Quién decidió: the role the user gives (never a phone or email).
   - Estado: `vigente`.
5. **If every agent must know it** (it changes what can be written, shown, promised or built), draft the one-line change to the matching `INDEX.md` too. Keep the client INDEX within 60 lines and a project INDEX within 40.
6. **Show the user the draft** (file path, content, INDEX change) and wait for an explicit yes. Writing to the vault publishes the decision to everyone who works with this client.
7. **Write it.**
   - With a local clone (`LABSKY_VAULT_DIR`): write the files there, then `git -C "$LABSKY_VAULT_DIR" pull --rebase`, `git add` the files, `git commit -m "docs(<client>): record <tema>"` and `git push`.
   - Without one: create each file with `gh api -X PUT repos/labsky-studios/labsky-vault/contents/<path> -f message="docs(<client>): record <tema>" -f content="$(base64 -w0 <file>)"` (add `-f sha=<sha>` to update an existing file).
8. Report the file's path and the INDEX line that changed.

## What NOT to do

- Never write to the vault without the user's approval in this conversation
- Never record a decision the user did not state or confirm
- Never put personal data (names of private individuals, phones, emails) in the vault
- Never save business decisions in auto memory instead of the vault
