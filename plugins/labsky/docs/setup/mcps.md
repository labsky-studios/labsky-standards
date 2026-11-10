# MCP Servers

> Reference doc — fetch when setting up a new repository, adding a new MCP server, or reviewing existing server configuration.

---

## What MCP servers are

MCP (Model Context Protocol) servers extend Claude Code with external capabilities — tools that go beyond reading and writing files in the repository. Each server exposes a set of tools that Claude can call during a session, backed by a running process or remote service.

Unlike hooks (which are deterministic gatekeepers) and subagents (which are isolated context windows), MCP servers give Claude access to live external systems: APIs, documentation indexes, browser automation, etc.

---

## MCP servers in the plugin

Servers every Labsky project needs are declared in the plugin, in `plugins/labsky/.mcp.json`. Enabling the plugin connects them; nothing is copied into the project. A server only one project needs goes in that project's own `.mcp.json`, listed in its `CLAUDE.md`. Servers that require credentials read them from environment variables, documented per server below.

### `context7` — live library documentation

Fetches up-to-date documentation for any library directly into Claude's context.

**Why this project:** The stack includes React 19, TanStack Router v1, TanStack Query v5, and Valibot — all actively evolving libraries whose APIs change between minor versions. Without this server, Claude responds based on training data that may reference deprecated APIs.

**How to use:** Add `use context7` to any prompt where library API correctness matters.

```
"How do I use useSearch in TanStack Router? use context7"
```

**Credentials:** None required.

**Config location:** `plugins/labsky/.mcp.json` (remote server, shown in `/mcp` as `plugin:labsky:context7`)

---

## Adding a new MCP server

### Step 1 — Evaluate fit

Before adding, answer:

| Question | Why it matters |
|---|---|
| Is the server from a known, trusted provider? | Servers run as local processes with access to the tool call stream |
| Does the team actually need it, or is it personal preference? | Project servers affect everyone who clones the repo |
| Does it require credentials? | Token management adds onboarding friction |
| Does it overlap with existing tools? | Redundant servers waste context budget |

If the server is personal (not needed by every dev), add it to `~/.claude/.mcp.json` instead.

### Step 2 — Add the server to `.mcp.json`

In `plugins/labsky/.mcp.json` if every Labsky project needs it, or in the project's own `.mcp.json` if only that project does.

```json
{
  "mcpServers": {
    "your-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name@latest"],
      "env": {
        "API_TOKEN": "${YOUR_TOKEN_ENV_VAR}"
      }
    }
  }
}
```

Never hardcode credentials. Always use `${ENV_VAR_NAME}` syntax — Claude Code substitutes from the environment at runtime.

### Step 3 — Approve it

A plugin server needs no approval: it connects when the plugin is enabled. A project server is approved by adding its name to `enabledMcpjsonServers` in the project's `.claude/settings.json`.

### Step 4 — Update this doc

Add an entry following the format of the servers above:

- Name and one-line description
- Why this project specifically needs it (not just "it's useful")
- How to invoke it (example prompt)
- Credentials: what env var, what scope, setup command
- Config location: project vs personal

### Step 5 — Document credentials in `docs/setup/` or onboarding

If the server requires a token, add setup instructions somewhere developers will find them during onboarding. Do not assume env vars are already set.

---

## Security considerations

MCP servers run as child processes on the developer's machine. They have access to the tool call JSON stream, which may include file contents, command output, and other context.

Before adding a server:

- Review the server's source if it is open source
- Confirm the server does not exfiltrate data to unexpected endpoints
- Prefer servers published by the tool vendor (GitHub's own server for GitHub, etc.)
- If a server requires broad API scopes, document exactly which scopes and why

Servers that write files or execute commands on behalf of Claude (not common but possible) require additional review — evaluate whether a hook is needed to gate those tool calls.

---

## File structure

```
plugins/labsky/.mcp.json   ← servers every Labsky project gets
<project>/.mcp.json        ← servers only that project needs
<project>/.claude/settings.json ← enabledMcpjsonServers approval for project servers
docs/setup/mcps.md         ← this file
```
