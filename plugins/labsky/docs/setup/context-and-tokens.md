# Context and Tokens

> Reference doc. Read when setting up a project for Claude Code, when a session wastes context (long greps, reading generated files, huge `CLAUDE.md`), or when evaluating a navigation tool.

Context is the scarcest resource of an agent session: every file read, every grep result and every rule loaded stays in the window and costs tokens on every turn after it. The standard keeps context small with five tools.

---

## 1. Progressive loading (always on)

What loads by itself at session start is kept small, and everything else is read on demand:

| Loaded at start | Size |
|---|---|
| The standard's `docs/INDEX.md` (a routing table, no rules) | ~100 lines |
| The project's `CLAUDE.md` | under ~100 lines |
| The client's and project's vault `INDEX.md` (`docs/setup/project-memory.md`) | ≤ 60 + 40 lines |
| The live code map (below) | ≤ 40 lines |

Docs, vault files, rules and code are read only when the task needs them. Never `@import` a doc into `CLAUDE.md`: an import loads it into every session.

---

## 2. Live code map (always on)

The plugin's SessionStart hook adds a compact map of the project, generated in each session so it never goes stale:

- The packages (the root, `cms/`, `apps/*`, `packages/*`).
- `src/features/*` with their subfolders.
- `src/routes/`.
- The CMS's collections, globals and endpoints.
- `src/db/schema/` tables.

Agents use it to go straight to the right folder instead of listing directories. It is capped at 40 lines; a larger project gets the first 40 and a note.

---

## 3. TypeScript LSP (plugin dependency)

The `labsky` plugin depends on the official `typescript-lsp@claude-plugins-official` plugin, which installs with it. With a language server running, Claude:

- Gets type errors and missing imports right after each edit, without running the build.
- Finds definitions and references by symbol (the `LSP` tool) instead of grepping text.

The plugin does not ship the language server binary. Install it once per machine:

```bash
pnpm add -g typescript-language-server typescript
```

Check with `/plugin` → Errors: a row `Executable not found in $PATH` means the binary is missing. Language servers do not start in cloud sessions or in CI.

---

## 4. Path-scoped rules (per project)

A rule that matters only for part of the code goes in `.claude/rules/<topic>.md` with a `paths` field, not in `CLAUDE.md`. Claude Code loads it only when Claude reads or edits a matching file:

```markdown
---
paths:
  - "src/features/*/constants/**"
---

# Contenido

- Every visible text, figure and date comes from a client source. …
```

Good candidates: client content rules (constants, CMS fallbacks), CMS-only rules (`cms/**`), migration rules (`**/migrations/**`), test conventions (`**/*.test.ts`). Keep each rule file to one topic. `CLAUDE.md` keeps what applies to every task.

---

## 5. Read denylist (per project)

Generated and bulky files waste context and are never the source of truth. The project's `.claude/settings.json` denies reading them (`/labsky:bootstrap-repo` adds it):

```json
{
  "permissions": {
    "deny": [
      "Read(./pnpm-lock.yaml)", "Read(./**/pnpm-lock.yaml)",
      "Read(./**/routeTree.gen.ts)", "Read(./**/payload-types.ts)", "Read(./**/importMap.js)",
      "Read(./**/migrations/*.json)", "Read(./**/worker-configuration.d.ts)", "Read(./**/cloudflare-env.d.ts)",
      "Read(./dist/**)", "Read(./**/.wrangler/**)", "Read(./**/.open-next/**)", "Read(./**/.tanstack/**)", "Read(./**/.output/**)"
    ]
  }
}
```

To learn what a generated file says, read its source (the route files, the collections, the schema). Add a project's own generated or vendored files to its list.

---

## Subagents for exploration

Broad searches ("where is X used across the repo?") go to a subagent (`Explore`, or a plugin agent): its file dumps stay in its own context and only the conclusion comes back. Verbose output (test logs, diffs) goes through `labsky:tester` and `labsky:reviewer` for the same reason.

---

## CodeGraph (**Proposed**: pilot)

[CodeGraph](https://github.com/colbymchenry/codegraph) (MIT) indexes a repository into a local SQLite graph (`.codegraph/`) and serves it over MCP, so the agent queries symbols and relationships instead of grepping. Third-party write-ups report 57–64% fewer tokens, but there is no official benchmark, and it overlaps with the LSP.

It enters the standard only if a pilot shows a clear gain over the LSP alone. Until then:

- **Install it locally only**, never in the plugin or a project's `.mcp.json`:
  1. `pnpm add -g @colbymchenry/codegraph`, then `codegraph install --target=claude`.
  2. Turn telemetry off: `codegraph telemetry off`.
  3. In the project, run `codegraph init` and add `.codegraph/` to `.gitignore`.
- Review its source and release before installing a new version: it reads the whole repository.

**Pilot protocol** (minh-portfolio first):

1. Pick three real tasks of different kinds: a feature, a bug fix and a refactor.
2. Run each twice from the same commit: once with only the LSP, once with CodeGraph enabled. Use the same model and prompt.
3. Record for each run: total tokens (`/cost` or the usage panel), number of tool calls, and whether the result was correct.
4. Record the results in the table below. Standardize it only if it saves at least 30% of tokens with no loss of correctness; otherwise drop it.

| Task | Tokens (LSP) | Tokens (LSP + CodeGraph) | Tool calls (LSP / +CG) | Correct (LSP / +CG) |
|---|---|---|---|---|
| pending | | | | |
