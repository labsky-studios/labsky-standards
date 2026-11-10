# State Management

> Read when: making any state decision beyond `useState`, working with Zustand, or reasoning about where state belongs.

---

## State tier model — always pick the lowest tier that works

| Tier | Tool | When to use |
|---|---|---|
| Local | `useState` | State is contained within a single component and not shared |
| Derived | Computed during render or `useMemo` | Value can be calculated from existing state — do not store it |
| Scoped | React Context | Shared state between parts of a Compound Component — scoped to that file, never exported |
| Feature / Global | Zustand | State shared across components or features; too complex for `useState` |
| Server | TanStack Query | All async data from an API — single source of truth |

The most common mistake is reaching for Zustand when `useState` or derived state is sufficient. Start at the lowest tier and move up only when you hit a real limitation.

---

## Zustand

Zustand is the standard for all feature-level and cross-feature client state.

### File location and naming

Stores live inside the owning feature's `stores/` folder. There is no root-level `src/stores/`. Global state lives in the feature that semantically owns it.

```
src/features/quote/
  stores/
    quote.store.ts
```

File naming: `[domain].store.ts`

### Store structure

Define the state type, the initial state, and the store in one file. Actions are defined inside the store creator — not as external functions.

```ts
// quote.store.ts
import { create } from "zustand";

type QuoteState = {
  currentStep: number;
  selectedPlan: string | null;
  formData: Partial<QuoteFormData>;
  // Actions
  setStep: (step: number) => void;
  selectPlan: (planId: string) => void;
  reset: () => void;
};

const initialState = {
  currentStep: 0,
  selectedPlan: null,
  formData: {},
};

export const useQuoteStore = create<QuoteState>()((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  selectPlan: (planId) => set({ selectedPlan: planId }),
  reset: () => set(initialState),
}));
```

### Consuming store state in components

Always select a slice — never subscribe to the entire store. Subscribing to the entire store causes re-renders on every state change regardless of what the component actually uses.

```ts
// Correct — slice selector
const currentStep = useQuoteStore((state) => state.currentStep);
const setStep = useQuoteStore((state) => state.setStep);

// Wrong — full store subscription
const store = useQuoteStore();
```

### Rules

- **One store per domain.** Do not create a single global store spanning multiple unrelated features.
- **Never mutate state directly.** Always use `set()` with an immutable update.
- **Never persist sensitive state** (tokens, personal data) without explicit encryption.
- **Actions live inside the store.** Do not define state mutation logic outside the store creator.
- **State type is always explicit.** Never let TypeScript infer the store type from the initial value.

---

## Zustand with persistence

Use `persist` middleware only when state genuinely needs to survive a page refresh. Never persist sensitive data.

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "user-preferences", // localStorage key
      partialize: (state) => ({ theme: state.theme }), // persist only what is needed
    }
  )
);
```

Never use `persist` for: access tokens, session data, form state, server-derived data.

---

## Zustand and TanStack Query — coordination

When a mutation succeeds and needs to update both server cache and client state:

```ts
useMutation({
  mutationFn: submitQuote,
  onSuccess: () => {
    // Invalidate server cache
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    // Update client state
    setStep(STEP_CODES.CONFIRMATION);
  },
});
```

Never copy query data into a Zustand store. TanStack Query is the source of truth for server data — read it directly with `useQuery`.

---

## TanStack Query — server state

TanStack Query is the single source of truth for all server data. Do not copy query data into Zustand or `useState`.

```ts
// Wrong — two sources of truth
const { data } = useQuery(getUserQueryOptions());
const [user, setUser] = useState(data);

// Correct
const { data: user } = useQuery(getUserQueryOptions());
```

### Query options pattern

Define query options in `queries/[domain].query.ts`. Never define them inline in a component.

```ts
// queries/vehicle.query.ts
import { queryOptions } from "@tanstack/react-query";
import { getVehicle } from "@/features/vehicle/services/vehicle.service";

export const getVehicleQueryOptions = (params: GetVehicleParams) =>
  queryOptions({
    queryKey: ["vehicle", params],
    queryFn: () => getVehicle(params),
    staleTime: 5 * 60 * 1000,
  });
```

---

## Common mistakes

| Mistake | Correct approach |
|---|---|
| Storing derived values in state | Compute during render: `const total = items.reduce(...)` |
| Copying server state into a Zustand store | Use TanStack Query directly — it is already the source of truth |
| Creating a store for component-local state | Use `useState` |
| Subscribing to the full store | Always use a selector: `useStore((s) => s.field)` |
| Defining actions outside the store creator | Actions belong inside `create()` |
| Persisting sensitive data | Never use `persist` for tokens, session, or personal data |

---

## Immer middleware

`immer` middleware is permitted when a store manages deeply nested state that would otherwise require verbose spread chains. It is not the default — use it only when the immutable update pattern becomes genuinely unreadable.

```ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export const useDeepStore = create<DeepState>()(
  immer((set) => ({
    config: { nested: { value: 0 } },
    updateValue: (v) =>
      set((state) => {
        // Direct mutation is safe inside immer
        state.config.nested.value = v;
      }),
  }))
);
```

**Rules:**
- Do not add `immer` as a default to all stores — only where nesting justifies it.
- Do not mix immer-style mutations with spread updates in the same `set()` call.
- If you find yourself adding immer because the state shape is complex, first evaluate whether the store should be split into smaller domain stores.
