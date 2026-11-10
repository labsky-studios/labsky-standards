# Agent Behaviour

> Read this alongside `preamble.md`. These rules govern how to operate — not just what to produce. Following the technical rules while violating these will still produce bad outcomes.

---

## Scope discipline — the most important rule

**Change only what the task requires. Nothing more.**

Agents tend to over-deliver: refactoring things they weren't asked to touch, renaming files for consistency, fixing violations they noticed along the way. This feels helpful but creates unreviewed changes the human did not ask for and cannot easily audit.

### What this means in practice

- If the task is "add a loading skeleton to `UserProfileCard`", touch only that component and what it directly requires. Do not reorganise the feature folder, rename hooks, or fix unrelated Biome warnings in the same PR.
- If you notice a violation in a file you are editing, **do not fix it.** Finish the task. Note the violation in your output so a human can decide whether to address it.
- If completing the task correctly requires touching more files than expected, **stop and report** before proceeding. Do not silently expand scope.

### The test

Before finishing, ask: does every change in this diff directly serve the task? If any change cannot answer that clearly, revert it.

---

## Handling existing code that violates the rules

The codebase may contain patterns that conflict with these docs — `useEffect` misuses, relative imports, or bare `<form>` tags without the shadcn `<Form />` wrapper. This is normal in an evolving codebase.

**Fix only what the task requires. Leave everything else untouched.**

- If a file you are editing contains an unrelated violation, leave it and note it in your output.
- Do not opportunistically refactor, even if the fix is small and obvious.
- Library migrations of any kind are explicit tasks — never a side effect.

---

## When to stop and ask

Stop and report to the human before proceeding if:

- **The task has architectural consequences** — where a new type of shared state should live, whether a new feature warrants a new folder, how to model a data relationship not covered by existing patterns.
- **Two interpretations would produce meaningfully different code.**
- **The task conflicts with a rule in these docs** — you are asked to use relative imports instead of `@/`, render a bare `<form>` without the shadcn `<Form />` wrapper, write a `useEffect` for data fetching, or use `register`/`Controller` directly inside a `<Form />`. Do not comply silently. Surface the conflict.
- **You would need to modify files outside the feature** in a way the task description did not anticipate.

When stopping, report:
1. What you found.
2. Why it requires human input.
3. The options you see, with a recommendation if you have one.

Do not report uncertainty to avoid making a decision. Use your judgment for things clearly covered by these docs. Stop only when the gap is real.

---

## Output hygiene

Every output must be clean before you finish:

- **No unused imports.** Remove them as you go — do not leave them for Biome to catch.
- **No commented-out code.** If you tried an approach and changed direction, delete the attempt.
- **No `console.log` or debug statements.** Remove all debugging artifacts.
- **No `TODO` comments** unless the task explicitly asks you to mark something pending. A `TODO` left in code is a liability that will never be read.
- **No placeholder content.** Every string, label, and value must be real or clearly flagged as required input from the human.

---

## Verifying external APIs

When making any claim about APIs, events, or configuration of external tools (Claude Code hooks, TanStack Router, Valibot, etc.), **do not treat the local doc or your training knowledge as the source of truth**. Always verify against the official documentation before making claims.

Specifically for Claude Code hooks: before asserting that a hook event is valid or invalid, check `https://code.claude.com/docs/en/hooks`. The local doc at `docs/setup/hooks.md` does not maintain a list of available events — that list lives only in the official documentation.

---

## Documenting assumptions

If completing the task requires a reasonable assumption not covered by the task description or these docs, document it explicitly in your output — not as a code comment, but as a note to the human.

```
Assumption: [what you assumed]
Reason:     [why this choice over the alternative]
Alternative:[what the other option would have been]
```

If the assumption is significant enough that getting it wrong requires substantial rework, stop and ask instead.
