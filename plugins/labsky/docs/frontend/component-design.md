# Component Design

> Read when: building or modifying UI components, applying styles, or making component structure decisions.

---

## Naming and exports

- **File:** `kebab-case`, suffix `.component.tsx` → `user-profile-card.component.tsx`
- **Function:** `PascalCase` matching the file name → `UserProfileCard`
- **Named exports only.** Default exports are forbidden.
- **Single file.** Related sub-components live in the same file as the main component.

```ts
// Importing a compound component and its sub-components from a single file
import { BaseStep, BaseStepTitle } from "@/features/steps/components/base-step.component";
```

---

## Props

- Define props as a `type`. Never use `interface` — `type` is the universal standard for everything in this codebase, including props.
- Name the type `[ComponentName]Props`.
- Never use `React.FC`. Declare props directly in the function signature.

```tsx
// ✅ Correct
type UserProfileCardProps = {
  userId: string;
  onSelect: (id: string) => void;
};

function UserProfileCard({ userId, onSelect }: UserProfileCardProps) {
  return <div onClick={() => onSelect(userId)}>...</div>;
}

// ❌ Wrong — React.FC obscures the return type and complicates generics
const UserProfileCard: React.FC<{ userId: string }> = ({ userId }) => <div>...</div>;
```

---

## Compound Component (Lego) rule

A component must use the Compound pattern when it has **more than one independently renderable sub-element**. A `<Badge>` or `<Spinner>` with a single visual element stays simple. Once a component needs a header, body, footer, or any section that consumers might want to control independently, it becomes Compound.

```tsx
// Simple — single visual element
<Spinner size="md" />

// Compound — multiple independently renderable sub-elements
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

Compound sub-components share state via **React Context**, scoped to the component file and never exported. Never pass shared state as props through multiple layers.

Context lives in the **same file** as the component that creates it — always. There is no `context/` folder at the feature level or anywhere else. A context that has grown large enough to feel like it needs its own file is a signal that the component should be split or the state moved to a Zustand store.

---

## Styling (Tailwind v4)

- Use Tailwind v4 default scales for spacing and typography.
- No arbitrary values (`w-[372px]`) unless absolutely unavoidable — document the reason inline when used.
- No inline `style` attributes for layout. Use Tailwind utilities.

---

## Performance

- **Zero Layout Shift (CLS) is a hard requirement.** Always define dimensions for media elements. Use skeleton loaders to preserve space during loading.
- **Responsiveness is mandatory.** Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) for all layouts. No component is desktop-only by default.

---

## Accessibility

- All components must be keyboard navigable.
- All interactive elements must have correct ARIA roles and labels.
- CLS is enforced via Lighthouse in CI — a failing score blocks the pipeline.
- Automated a11y testing (axe or equivalent) runs in CI — a failing check blocks the pipeline.

---

## Semantic HTML

Use the correct element for the job. Never use a `<div>` where a semantic element is appropriate.

| Use case | Element |
|---|---|
| Primary navigation | `<nav>` |
| Main page content | `<main>` |
| Standalone content block | `<article>` |
| Thematic grouping with heading | `<section>` |
| Page header / section header | `<header>` |
| Clickable action | `<button>` |
| Navigation link | `<a>` |

Semantic HTML directly affects SEO and accessibility. `<div>` and `<span>` are for layout and styling only.
