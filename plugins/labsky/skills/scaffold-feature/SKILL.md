---
name: scaffold-feature
description: Create the folder structure and placeholder files for a new feature. Use when starting a new feature from scratch. Runs the internal CLI first and only falls back to manual creation if the CLI cannot cover the case.
disable-model-invocation: true
allowed-tools: Bash(pnpm scaffold *), Bash(ls *), Bash(test *), Read, Glob, Write
---

## Before starting

The Labsky standard's docs are in `${CLAUDE_PLUGIN_ROOT}/docs/`. Every `docs/...` path below is relative to that folder.

Read `docs/frontend/architecture.md` — specifically the "Feature folder decision table" and "Internal CLI" sections. All folder structure rules are defined there. Do not apply rules from memory.

## Steps

1. Confirm the feature name from `$ARGUMENTS`. If not provided, ask. Feature names are kebab-case.

2. Check whether `src/features/[feature-name]/` already exists:
   ```bash
   test -d src/features/[feature-name] && echo "exists" || echo "clear"
   ```
   If it exists, stop and report. Never overwrite an existing feature.

3. Ask which subfolders are needed. Present the full list from the decision table in `docs/frontend/architecture.md` — read it first, present from it.

4. Run the internal CLI:
   ```bash
   pnpm scaffold feature [feature-name]
   ```

5. Compare the scaffolded output against the subfolders requested. Remove any scaffolded folders that were not requested.

6. If the CLI is not available or fails, create the structure manually:
   - Create only the requested subfolders plus `tests/`
   - Add a `.gitkeep` file inside each empty folder
   - Do not create stub TypeScript files with incomplete content

7. Verify the final structure with `ls -la src/features/[feature-name]/`.

8. Report every path created.

## What NOT to do

- Follow all rules in `docs/never/no-go-list.md` — applies to every file created
- Never create route files — TanStack Router generates these from the file tree
- Never create files outside `src/features/`
- Never deviate from the scaffolded structure without reporting the reason