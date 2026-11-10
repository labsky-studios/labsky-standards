# labsky-standards

The Labsky Studios development standard: the conventions every Labsky project follows, and the Claude Code plugin that brings them into each session.

It serves two audiences at once: **developers** (conventions to follow) and **AI agents** (rules to enforce). The docs are the single source of truth. The plugin's agents, skills and hooks are a thin layer that points to them and enforces the rules that must always hold.

---

## Repo structure

```
labsky-standards/
├── .claude-plugin/
│   └── marketplace.json        # The "labsky" marketplace, with one plugin
├── plugins/labsky/             # The plugin every project enables
│   ├── .claude-plugin/plugin.json
│   ├── .mcp.json               # MCP servers every project gets (context7)
│   ├── agents/                 # reviewer, tester, committer, scaffolder
│   ├── skills/                 # review-pr, commit, scaffold-feature
│   ├── hooks/hooks.json        # SessionStart, PreToolUse and PostToolUse wiring
│   ├── scripts/                # The hook scripts (TypeScript, run by Node 24)
│   └── docs/                   # The standard itself
│       ├── INDEX.md            # Routing table, loaded into every session
│       ├── always/             # Mandatory for every task
│       ├── never/              # Explicit prohibitions
│       ├── frontend/           # Task-specific frontend docs
│       └── setup/              # Infrastructure guides (git hooks, CI, hooks, agents, MCPs)
└── template/
    ├── CLAUDE.md               # Copy to a new project and fill in
    └── CLAUDE.example.md       # A filled-in example
```

---

## Adopting the standard in a project

1. Add `.claude/settings.json` to the project and commit it:

   ```json
   {
     "extraKnownMarketplaces": {
       "labsky": {
         "source": { "source": "github", "repo": "labsky-studios/labsky-standards" }
       }
     },
     "enabledPlugins": {
       "labsky@labsky": true
     }
   }
   ```

2. Copy `template/CLAUDE.md` to the project root and fill in the placeholders.
3. Add `.claude/audit.log` to the project's `.gitignore`.
4. Open the project in Claude Code and trust the folder: it offers to install the marketplace and the plugin. Run `/plugin` to confirm `labsky` is enabled.

To install it by hand instead (Claude Code 2.1.275 or later):

```
/plugin install labsky --marketplace labsky-studios/labsky-standards
```

Nothing is copied into the project. When the standard changes, every project gets it on the next plugin update (`/plugin` → Marketplaces → update, or automatic updates).

Hooks need Node 24+ on the developer's machine (they run TypeScript with Node's native type stripping).

---

## Working on the standard

Test a change locally before publishing it, from any Labsky project:

```bash
claude --plugin-dir /path/to/labsky-standards/plugins/labsky
```

Validate the marketplace and the plugin:

```bash
claude plugin validate .
claude plugin validate ./plugins/labsky
```

**Adding a convention**: add or edit a file under `plugins/labsky/docs/`. If you add a file, add its row to `docs/INDEX.md`.

**Changing an always-read rule**: edit `docs/always/preamble.md` or `docs/always/agent-behaviour.md`. They are read on every task.

**Adding an agent, skill or hook**: see `docs/setup/subagents.md` and `docs/setup/hooks.md`. Agents and skills reference docs as `${CLAUDE_PLUGIN_ROOT}/docs/...`, which Claude Code substitutes with the plugin's installed path.

**A rule that can be enforced mechanically** (a lint rule, a type error, a hook) belongs there, not in a doc. Docs are for rules that need judgment.

---

## Versioning

The plugin's version lives in `plugins/labsky/.claude-plugin/plugin.json` and follows semver. Projects stay on a version until it changes, so bump it in every release.

| Change | Version bump |
|---|---|
| Remove or rename an agent, skill or hook | Major |
| Add a doc, agent, skill or hook | Minor |
| Edit wording in a doc, fix a hook bug | Patch |

Tag each release as `vX.Y.Z`.

---

## What not to do

- **Do not add rules to agent prompts.** Rules live in `docs/`; agents read them.
- **Do not add project-specific rules here.** They belong in that project's `CLAUDE.md` or its `docs/local/`.
- **Do not grow `docs/INDEX.md` into a rulebook.** It is a routing table, loaded into every session, so every line costs context.
- **Do not duplicate rules across projects.** If three projects share the same override, it belongs in the standard.
