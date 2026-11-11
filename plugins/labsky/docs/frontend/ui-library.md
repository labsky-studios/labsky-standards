# UI & Component Library

> Read when: building UI, adding interactive elements, implementing loading, empty, or error states, working with modals, dialogs, or tooltips.

---

## Component selection hierarchy

Before writing any UI component, follow this order:

1. **`shadcn/ui`** — check here first. shadcn components live in `src/components/ui/` and can be edited directly.
2. **Radix UI primitives** — use only when shadcn does not provide the primitive. This is rare.
3. **Built from scratch** — last resort, only for components with no analogue in any of the above.

---

## shadcn/ui

shadcn/ui is the component foundation for cases not covered by the in-house library. It is Radix UI under the hood — every interactive primitive (Dialog, Select, Tooltip, Popover, Accordion, DropdownMenu, etc.) is already accessible, keyboard navigable, and portal-aware by default.

**Before building any UI component from scratch, check if shadcn/ui already provides it. If it does, use it as the base.**

### What "using it as the base" means

- Take the shadcn component as-is for structure and behaviour.
- Restyle with Tailwind v4 utilities to match the project's design.
- Add animations where required (see `docs/frontend/patterns.md`).
- Never rewrite the underlying Radix primitive logic — you lose accessibility for free.

```tsx
// ❌ Wrong — building a dialog from scratch
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6">{children}</div>
    </div>
  );
}

// ✅ Correct — extend the shadcn Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ConfirmDialog({ open, onOpenChange, title, children }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

### Primitive mapping

| Need | Use |
|---|---|
| Dialog / Modal | `Dialog` from shadcn |
| Tooltip | `Tooltip` from shadcn |
| Dropdown menu | `DropdownMenu` from shadcn |
| Popover | `Popover` from shadcn |
| Select input | `Select` from shadcn |
| Toast / notification | `Sonner` or shadcn `Toast` |

Only reach for `createPortal` directly if shadcn/Radix genuinely cannot serve the use case.

### Customising shadcn components

shadcn components live in `src/components/ui/` — they are not a locked dependency. Edit them directly.

- Edit the source file in `src/components/ui/` — do not wrap a shadcn component in another component just to change a class.
- Document any non-trivial structural change with a comment explaining why the default was modified.
- Never re-add Radix behaviour that shadcn already provides (focus management, ARIA roles, keyboard events).

---

## Loading states

Every async operation must have a loading state. A UI with no loading feedback feels broken and causes double-submission.

| Context | Pattern |
|---|---|
| Full page or section data | `useSuspenseQuery` + `<Suspense fallback={<Skeleton />}>` |
| Button triggering an action | Disabled + spinner inside the button |
| Inline data (a count, a label) | Subtle pulse skeleton inline |
| Background refetch | No indicator unless it takes more than ~1s |

**Rules:**
- Skeleton shape must match content shape. A skeleton that looks nothing like the loaded content causes layout shift.
- Never show a blank white area while data is loading.
- Disable interactive elements during submission to prevent double-submission.
- Never track loading state manually with `useState` — use TanStack Query.

### `useSuspenseQuery` + `<Suspense>` — preferred for component data

Use `useSuspenseQuery` when a component's entire render depends on async data. The component suspends while loading — it only renders when data is ready, so `data` is always defined and `isLoading` does not exist on the return value.

The loading state is handled by the nearest `<Suspense>` boundary via its `fallback` prop. Pair it with an Error Boundary to handle fetch failures.

```tsx
// The data-fetching component — renders only when data is ready
function VehicleTypeSelector() {
  const { data } = useSuspenseQuery(getVehicleTypesQueryOptions());
  return <Combobox options={data.data} />;
}

// The parent wraps it in Suspense + ErrorBoundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<ComboboxSkeleton />}>
    <VehicleTypeSelector />
  </Suspense>
</ErrorBoundary>
```

The fallback must be a skeleton that matches the shape of the loaded content — not a spinner, not nothing.

### `useQuery` — for conditional or inline data

Use `useQuery` (with `isLoading`) when only part of the UI depends on the data, or when you need to conditionally render based on loading state within the same component.

```tsx
const { data, isLoading } = useQuery(getUserQueryOptions());

if (isLoading) return <UserProfileCardSkeleton />;
return <UserProfileCard user={data} />;
```

---

## Empty states

Every view that renders a list or data set must handle the empty case explicitly. An empty array rendering nothing is a blank screen that looks like a bug.

An empty state must communicate:
- That there is genuinely no data (not a loading failure).
- What the user can do about it, if anything.

```tsx
if (!items.length) {
  return (
    <EmptyState
      title="No results found"
      description="Try adjusting your filters or adding a new item."
      action={<Button onClick={onAdd}>Add item</Button>}
    />
  );
}
```

**Rules:**
- Every list, table, or data view must have an explicit empty state branch.
- `items.length > 0 && <List />` is not an empty state — the falsy branch renders nothing.
- Empty states must be visually distinct from error states.

---

## Error states

Error states close the loop with the error hierarchy defined in `docs/frontend/data-and-validation.md`.

| Error type | Pattern | Notes |
|---|---|---|
| Fatal / unrecoverable | React Error Boundary | Replaces the entire section or page with a fallback UI |
| Recoverable (user can retry) | Toast via Sonner | Maximum 3 toasts stacked at once |
| Field-specific | Inline, below the input | No icon required — proximity communicates ownership |

**Rules:**
- Error states must be visually distinct from empty states. A failed fetch and an empty result are different things and must look different.
- Never swallow an error silently — if something went wrong, the user must be told.
- For Error Boundaries: always provide a recovery action (retry button, "go back" link) — never a dead end.

```tsx
// Error Boundary fallback
function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="text-destructive">Something went wrong.</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}
```

---

## Optimistic updates

Use optimistic updates when the operation is low-risk and the latency improvement meaningfully benefits UX — toggling a like, reordering a list, marking an item complete.

Do not use optimistic updates for destructive or irreversible operations (deleting records, submitting financial data, sending communications) — always wait for server confirmation on these.

```ts
useMutation({
  mutationFn: updateItem,
  onMutate: async (newItem) => {
    await queryClient.cancelQueries({ queryKey: ["items"] });
    const previous = queryClient.getQueryData(["items"]);
    queryClient.setQueryData(["items"], (old) =>
      old.map(item => item.id === newItem.id ? { ...item, ...newItem } : item)
    );
    return { previous };
  },
  onError: (_err, _newItem, context) => {
    queryClient.setQueryData(["items"], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
  },
});
```

Always implement `onError` to roll back on mutation failure. An optimistic update without a rollback is a data integrity bug.
