# Code Quality

> Read when: writing functions, hooks, or components; reviewing code structure; deciding what to comment or delete.

---

## Single responsibility

Every function, hook, and component must do one thing. This is a responsibility rule, not a line count rule. A 20-line function that does three things needs to be split. A 150-line component that does one complex thing cohesively does not.

**The test:** can you describe what this does in one sentence without using "and"? If not, split it.

```tsx
// ❌ Wrong — fetches data, transforms it, AND manages UI state
function useUserDashboard() {
  const { data } = useQuery(getUserQueryOptions());
  const [tab, setTab] = useState("overview");
  const formatted = data?.items.map(i => ({ ...i, label: i.name.toUpperCase() }));
  return { formatted, tab, setTab };
}

// ✅ Correct — each hook has one job
function useUserItems() {
  const { data } = useQuery(getUserQueryOptions());
  return data?.items.map(i => ({ ...i, label: i.name.toUpperCase() }));
}

function useActiveTab() {
  const [tab, setTab] = useState("overview");
  return { tab, setTab };
}
```

---

## Custom hook conventions

- **`use` prefix is mandatory.** No exceptions.
- **Name communicates what the hook does and what it returns.** `useFormSubmission` is clear. `useLogic` is not.
- **Single responsibility.** One hook, one concern.
- **Feature hooks in `hooks/`.** Feature-specific hooks: `src/features/[feature]/hooks/`. Genuinely reusable across features: `src/hooks/`.
- **Hooks wrap complexity, not convenience.** Do not create a hook to avoid two lines of inline code. A hook earns its existence by encapsulating logic that would otherwise be repeated or is too complex to live in a component.

```tsx
// ❌ Bad names
function useData() { ... }
function useQuoteLogic() { ... }

// ✅ Good names — self-documenting
function useRecoveredQuoteSteps() { ... }
function useProductCategoryFlow() { ... }
```

---

## Comments

Code should be self-documenting. The need for a comment is usually a signal that the code should be clearer.

**Comments are reserved for:**
- Explaining *why* a non-obvious decision was made — never *what* the code does.
- Flagging known limitations or intentional workarounds.
- Documenting deliberate deviations from the rules in this notebook.

```ts
// ❌ Wrong — restates what the code says
// Filter active items and sort by name
const sorted = items.filter(i => i.active).sort((a, b) => a.name.localeCompare(b.name));

// ✅ Correct — explains a non-obvious decision
// The API returns items in insertion order but the design requires alphabetical.
// Sorting client-side until the endpoint supports an order param.
const sorted = items.filter(i => i.active).sort((a, b) => a.name.localeCompare(b.name));
```

**Never leave commented-out code.** If code is not being used, delete it. Git history is the backup.

---

## Dead code

Delete unused code immediately:
- Unused variables, functions, hooks, components.
- Commented-out code blocks.
- Imports no longer referenced.
- Feature flags or conditions that can never be true.

If it is not running, it does not exist in the codebase. Git history preserves everything.

Biome flags unused imports and variables. Treat these as errors, not warnings.
