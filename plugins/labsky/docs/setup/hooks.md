# Safety Hooks

> Reference doc. Fetch when reviewing what the plugin blocks, when a hook blocks something legitimately, or when adding a rule.

---

## What hooks are

Hooks are scripts Claude Code runs at fixed points of a session. Unlike the docs, which the model reads and interprets, hooks run outside the model: a blocked action is blocked whatever the task says. Rules that must always hold live in a hook; rules that need judgment live in a doc.

For the list of hook events and their payloads, see the [official documentation](https://code.claude.com/docs/en/hooks). It is not copied here, to avoid drift.

---

## How the plugin wires them

The `labsky` plugin declares its hooks in `plugins/labsky/hooks/hooks.json`. Every project that enables the plugin gets them; nothing is copied into the project.

| Event | Script | Does |
|---|---|---|
| `SessionStart` | `scripts/session-start.hook.ts` | Loads `docs/INDEX.md` into the session, with absolute paths to the docs |
| `PreToolUse` (Bash) | `scripts/pre-bash.hook.ts` | Blocks commands the standard never lets an agent run |
| `PreToolUse` (Write, Edit, MultiEdit) | `scripts/pre-write.hook.ts` | Blocks writes to secret, generated and immutable files |
| `PostToolUse` (Bash, Write, Edit, MultiEdit) | `scripts/audit-log.hook.ts` | Appends one line per call to `<project>/.claude/audit.log` |

The scripts are TypeScript run directly by Node 24+ (native type stripping): erasable syntax only, no dependencies, no imports beyond `node:*`. They are called in exec form (`"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/…"]`), so paths with spaces and Windows shells need no quoting.

**Exit codes.** `0` allows. `2` blocks, and Claude reads the hook's stderr as the reason. Any other code is a non-blocking error: the action still runs. A blocking rule must exit `2`.

Add `.claude/audit.log` to every project's `.gitignore`.

---

## What is blocked

### `pre-bash.hook.ts`

Each segment of a chained command (`&&`, `||`, `;`, newline) is checked on its own.

| Blocked | Why |
|---|---|
| `rm -rf` (any flag order), `rm --no-preserve-root`, `truncate -s 0` | Irreversible data loss |
| `git push` whose target branch is `main`, `staging` or `dev`, including a bare `git push` from one of them | All changes arrive by PR |
| `git push --force`, `-f`, `+refspec` | Rewrites shared history. `--force-with-lease` on a feature branch is allowed |
| `git commit`, `merge`, `rebase`, `cherry-pick`, `revert` while on `main`, `staging` or `dev` | Work happens on feature branches |
| `git commit --no-verify` / `-n` | Bypasses Husky |
| `gh pr merge` of a PR whose base is not `dev` | `dev→staging` is promoted by the CI bot; `staging→main` is approved by a human |
| `wrangler deploy`, `wrangler versions deploy`, `wrangler pages deploy`, `opennextjs-cloudflare deploy` | Deploys run in CI |
| `pnpm deploy`, `pnpm run deploy[:…]`, `NODE_ENV=production … payload migrate` | The project's deploy scripts and production migrations run in CI |
| `wrangler d1 migrations apply --remote`, `wrangler d1 execute --remote` | Remote data changes run in CI or by a human |
| `wrangler secret …`, `wrangler delete`, `wrangler d1 delete`, `wrangler r2 bucket delete` | Secrets and destructive Cloudflare operations belong to a human |
| `npm install/i/add/ci`, `yarn`, `npx` | pnpm only (`pnpm dlx` replaces `npx`) |
| `pnpm add` without `-D` | A runtime dependency needs a human to confirm it belongs to the stack |
| A literal value assigned to `*TOKEN`, `*API_KEY`, `*SECRET`, `*PASSWORD`, `*PRIVATE_KEY` | Secrets come from the environment |
| `sed -i` or `awk … >` on `tsconfig.json`, `biome.json`, `vite.config.*`, `package.json`, `wrangler.json(c)` | Critical config is edited with the Edit tool, so the change is visible |

### `pre-write.hook.ts`

Paths are resolved against the project root (`CLAUDE_PROJECT_DIR`). Files outside the project, such as plans, memory or scratch space, are not governed by it.

| Blocked | Why |
|---|---|
| `.env`, `.env.*` (except `*.example`), `.dev.vars*` | Hold secrets. Document the variable in `.env.example` and let a human set it |
| Anything under `.git/` | Managed by git |
| `routeTree.gen.ts`, `payload-types.ts`, `types/generated/**`, `worker-configuration.d.ts`, `cloudflare-env.d.ts`, Payload's `importMap.js`, `pnpm-lock.yaml` | Generated: change the source and regenerate |
| An existing file under any `migrations/` folder | A migration that may have run is never edited: create a new one |

Creating a new migration file is allowed.

---

## Adding or changing a rule

1. Decide where it belongs: a command rule goes in `pre-bash.hook.ts`, a file rule in `pre-write.hook.ts`. If it needs judgment, it belongs in a doc instead.
2. Add the pattern with a comment that says what it blocks and why, and a `block()` message that tells the agent what to do instead.
3. Test it from the project you care about:

   ```bash
   echo '{"cwd":".","tool_input":{"command":"git push origin dev"}}' | node plugins/labsky/scripts/pre-bash.hook.ts; echo $?
   ```

   `2` means blocked, `0` allowed.
4. Update the tables above and bump the plugin's patch version.

---

## When a hook blocks something legitimate

Hooks only intercept Claude's tool calls, not your own terminal.

1. Read the block message: it names the rule and the alternative.
2. If the action is safe and you need it once, run it yourself in a terminal.
3. If the block is a recurring false positive, open a PR against `labsky-standards` that relaxes the rule, explains in a code comment why the exception is safe, and updates this doc.
4. If unsure, ask before changing anything. Never loosen a rule silently.
