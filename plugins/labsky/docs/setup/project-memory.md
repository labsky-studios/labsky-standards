# Project Memory

> Reference doc. Read when a task depends on a client's or project's business context (product, audience, brand, content rules, past decisions), when recording a decision, or when connecting a project to its memory.

---

## Where each kind of knowledge lives

| Knowledge | Lives in | Why |
|---|---|---|
| How Labsky writes code, reviews, ships | This standard (`labsky-standards`) | Same for every project |
| A project's stack, commands, overrides, technical gotchas | The project's `CLAUDE.md`, `.claude/rules/` and `docs/decisions/` | Versioned with the code it describes |
| A client's brand, voice, content sources, approvals, business decisions | `labsky-vault/clients/<client>/` | Shared by every project of that client |
| A project's product, audience, emotional core, copy rules, business decisions | `labsky-vault/clients/<client>/projects/<project>/` | Business context, owned by the client, outlives the code |
| A person's own working preferences | Claude's auto memory (local to each machine) | Personal; never the source of project facts |

Auto memory is machine-local: it never reaches another device, a teammate or CI. Nothing the project depends on may live only there.

---

## The vault

`labsky-studios/labsky-vault` is a private repository of Markdown files. It is free, versioned, and readable from anywhere:

- **Edit** on github.com or the GitHub mobile app, or on a desktop with Obsidian (free) and its Obsidian Git plugin. Use standard relative Markdown links so both Obsidian and agents follow them.
- **Agents read** it from a local clone when `LABSKY_VAULT_DIR` is set, otherwise through `gh api`. CI's AI review checks it out (`docs/setup/github-and-ci.md`).
- **Written in the client's language** (Spanish for MINH). The standard and `CLAUDE.md` stay in English.
- **Nothing is invented.** A missing fact is written as `pendiente de <cliente>`, and every file says which source its content came from.
- **No personal data**: roles, not names, phones or emails of private individuals.

```
labsky-vault/
├─ README.md
├─ templates/                      decision.md · client.md · brand.md · project.md
├─ labsky/                         the studio's own philosophy and way of working
└─ clients/<client>/
   ├─ INDEX.md                     ≤ 60 lines, loaded into every session of the client's projects
   ├─ client.md · brand.md · content-sources.md
   ├─ decisions/AAAA-MM-DD-<tema>.md
   └─ projects/<project>/
      ├─ INDEX.md                  ≤ 40 lines, loaded into every session of the project
      ├─ product.md · copy-rules.md
      └─ decisions/
```

An `INDEX.md` holds only what every agent must know in every task (what can never be written, shown or promised) and links to the rest. Detail goes in the linked files, read on demand.

---

## Connecting a project

The project's `CLAUDE.md` names its client and memory in **Project identity**:

```markdown
- **Client:** minh
- **Memory:** `clients/minh/projects/minh-portfolio`
```

The plugin's SessionStart hook reads both lines and loads `clients/<client>/INDEX.md` and `<Memory>/INDEX.md` into the session. Without the vault (no clone, no `gh` access) the session says so in one line and agents ask before assuming business facts.

To read the vault from a local clone, which is faster, works offline and is what Obsidian edits:

```bash
git clone https://github.com/labsky-studios/labsky-vault.git C:/dev/labsky-vault
```

Then in `~/.claude/settings.json`:

```json
{ "env": { "LABSKY_VAULT_DIR": "C:/dev/labsky-vault" } }
```

---

## Using it

- **planner**: reads the client's and project's memory before planning (audience, non-goals, pending content).
- **reviewer**: on diffs that add or change visible content, `brand.md` and the project's `copy-rules.md` are review criteria with the same weight as `CLAUDE.md`.
- **ship**: reads the project's `product.md` when an issue touches UI or copy.
- **Recording**: when the user states or confirms a business, brand, product or content decision, propose `/labsky:decide`. It drafts the decision, shows it, and commits it to the vault only after approval. A decision that replaces an earlier one marks the old file `Estado: reemplazada por <file>`; history is never deleted.
- **Technical decisions** (architecture, libraries, conventions) go in the project's `docs/decisions/` or in the standard, not in the vault.
