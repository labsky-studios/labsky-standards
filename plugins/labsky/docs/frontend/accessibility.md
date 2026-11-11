# Accessibility

> Read when: building any interactive UI element, implementing keyboard navigation, using ARIA, or managing focus.

---

## Non-negotiable baseline

Every component shipped must meet these requirements without exception:

- Keyboard navigable — all interactive elements reachable and operable via keyboard.
- Correct ARIA roles and labels on all interactive and landmark elements.
- Zero accessibility violations as reported by axe in CI.
- Lighthouse accessibility score ≥ 90 in CI — a failing score blocks the pipeline.
- No layout shift on focus — visible focus ring on all interactive elements.

---

## Semantic HTML first

The correct element eliminates the need for ARIA in most cases. Use the right element before reaching for ARIA roles.

| Use case | Element | Do not use |
|---|---|---|
| Clickable action | `<button>` | `<div onClick>`, `<span onClick>` |
| Navigation link | `<a href>` | `<button>` for navigation, `<div onClick>` |
| Primary navigation | `<nav>` | `<div>` |
| Main page content | `<main>` | `<div id="main">` |
| Page / section header | `<header>` | `<div class="header">` |
| Standalone content block | `<article>` | `<div>` |
| Thematic grouping with heading | `<section>` | `<div>` |
| Data table | `<table>`, `<th>`, `<td>` | `<div>` grid layout |
| Form field label | `<label for="id">` | Adjacent text |

---

## shadcn/ui and accessibility

shadcn/ui components are built on Radix UI, which handles accessibility primitives correctly by default: focus management, ARIA roles, keyboard events, portal behaviour. Never rewrite these — you lose correct behaviour for free.

What shadcn gives you automatically:
- Focus trap in modals and dialogs.
- `Escape` to close overlays.
- `aria-expanded`, `aria-haspopup`, `aria-controls` on triggers.
- Correct `role` on all interactive components.
- Screen-reader-only text where visual content is insufficient.

What you are responsible for:
- Providing meaningful `aria-label` on icon-only buttons.
- Providing `aria-labelledby` when a dialog's title is visually separate from its trigger.
- Ensuring dynamic content changes are announced via `aria-live` regions where appropriate.

---

## Focus management

### Visible focus ring

All interactive elements must have a visible focus ring. Tailwind provides `focus-visible:ring-2` — apply it consistently.

```tsx
// Correct — focus ring always visible
<button className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  Submit
</button>
```

Never use `outline: none` or `outline: 0` without replacing it with a custom focus ring.

### Focus trapping

Use Radix UI's Dialog or Popover for any overlay that requires focus trapping. Do not implement focus trapping manually.

### Focus after dynamic content changes

When content changes dynamically (e.g. a step progresses, a section loads), move focus to the new content so keyboard and screen reader users are not stranded.

```tsx
const headingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  headingRef.current?.focus();
}, [currentStep]);

<h2 ref={headingRef} tabIndex={-1}>Step {currentStep}: {stepTitle}</h2>
```

---

## ARIA — use only when necessary

ARIA supplements HTML — it does not replace it. Add ARIA only when a semantic element alone is insufficient.

### Common patterns

**Icon-only button:**
```tsx
<button aria-label="Close dialog">
  <X className="size-4" aria-hidden="true" />
</button>
```

**Live region for dynamic updates:**
```tsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

**Loading state:**
```tsx
<button disabled aria-busy="true">
  <Spinner aria-hidden="true" />
  <span className="sr-only">Loading…</span>
</button>
```

**Decorative icons:**
Always add `aria-hidden="true"` to icons that are purely decorative. If an icon conveys meaning, it must have visible or screen-reader text alongside it.

---

## Forms and inputs

- Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>`.
- Use `htmlFor` + `id` pairing — do not rely on visual proximity.
- Error messages must be linked to the field with `aria-describedby`.
- Required fields must be marked with `aria-required="true"` or `required`.

```tsx
<div>
  <label htmlFor="email">Email address</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && (
    <p id="email-error" role="alert">{errors.email.message}</p>
  )}
</div>
```

---

## Keyboard interaction conventions

| Component | Expected keyboard behaviour |
|---|---|
| Button | `Enter` / `Space` activates |
| Link | `Enter` navigates |
| Dialog | `Escape` closes; focus returns to trigger |
| Dropdown menu | Arrow keys navigate items; `Enter` selects; `Escape` closes |
| Tabs | Arrow keys switch tabs; `Tab` moves to tab panel |
| Checkbox | `Space` toggles |
| Radio group | Arrow keys move selection |

Radix UI primitives handle these conventions correctly. Do not override them without a documented reason.

---

## Testing accessibility

Every component test must include an axe check. See `docs/frontend/testing.md` for the implementation pattern.

Axe catches ~30% of accessibility issues automatically. Manual keyboard testing is required for complex interactive components — test with keyboard only, no mouse.
