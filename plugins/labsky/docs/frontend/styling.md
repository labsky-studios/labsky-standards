# Styling

> Read when: defining component variants, applying conditional classes, working with Tailwind utilities, or touching the CSS entry point.

---

## Utility stack

| Tool | Purpose |
|---|---|
| Tailwind CSS v4 | Utility classes — spacing, typography, layout, colour |
| `@tailwindcss/vite` | Vite plugin — replaces PostCSS; no `tailwind.config.js` needed |
| CVA (`class-variance-authority`) | Component variants with typed props |
| `clsx` | Conditional class merging |
| `tailwind-merge` | Resolving Tailwind class conflicts |
| `cn()` helper | Combines `clsx` + `tailwind-merge` — use this for everything |

---

## CSS entry point

All CSS configuration lives in `src/styles/main.css`. Do not create a `tailwind.config.js` — Tailwind v4 is configured entirely in CSS.

```css
/* src/styles/main.css */
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");
@import "tailwindcss";
@import "tw-animate-css";
```

**Import order matters:**
1. Google Fonts — loaded first so the font is available to all following rules
2. `tailwindcss` — core utilities
3. `tw-animate-css` — animation utilities

---

## Design tokens

Project-level tokens are declared in `@theme` in the CSS entry point.

```css
@theme {
  --color-complementary-background: #f8fbfd;
  --color-light-gray: #f2f2f2;
  --font-poppins: "Poppins", system-ui, -apple-system, sans-serif;
  --header-height-mobile: 56px;
  --footer-height-mobile: auto;
  --header-height-desktop: 80px;
  --footer-height-desktop: 80px;
}
```

Header and footer heights are also exposed as responsive CSS custom properties via `@layer base`:

```css
:root {
  --header-height: var(--header-height-mobile);
  --footer-height: var(--footer-height-mobile);
}

@media (width >= --theme(--breakpoint-lg)) {
  :root {
    --header-height: var(--header-height-desktop);
    --footer-height: var(--footer-height-desktop);
  }
}
```

Use `var(--header-height)` and `var(--footer-height)` in components that need to account for the fixed header/footer — never hardcode these values.

Only add tokens to `@theme` when they are project-specific and not already defined globally.

---

## Custom utilities

Custom Tailwind utilities are defined with `@utility` in `src/styles/main.css`. Use this only for utilities that need to be reusable across the codebase and cannot be expressed as a component.

```css
@utility custom-scrollbar {
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background-color: transparent; }
  ::-webkit-scrollbar-thumb {
    background-color: var(--color-primary);
    border-radius: 12px;
  }
}

@utility container {
  padding-inline: 1rem;
  @media (width >= --theme(--breakpoint-md)) { padding-inline: 2rem; }
  @media (width >= 1400px) { padding-inline: 0; }
}
```

`custom-scrollbar` and `container` are applied globally in `@layer base`. Do not re-apply them on individual elements.

---

## `cn()` — the only way to compose classes

`cn()` is the project-wide helper for all class composition. It lives at `src/lib/utils.ts`.

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// Correct — conditional classes via cn()
<div className={cn("px-4 py-2 rounded", isActive && "bg-primary text-white", className)} />

// Wrong — string concatenation
<div className={`px-4 py-2 rounded ${isActive ? "bg-primary text-white" : ""}`} />

// Wrong — clsx or twMerge called directly
<div className={clsx("px-4 py-2", isActive && "bg-primary")} />
```

Always accept an optional `className` prop on components that consumers may need to extend. Merge it last via `cn()` so consumer classes can override defaults.

```tsx
type ButtonProps = { className?: string };

function Button({ className, ...props }: ButtonProps) {
  return <button className={cn("px-4 py-2 rounded font-medium", className)} {...props} />;
}
```

---

## CVA — component variants

Use CVA when a component has two or more visual variants driven by props. Do not use ternaries or conditional `cn()` calls for multi-variant logic — CVA keeps variants typed and co-located.

```ts
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { className?: string };

function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

### CVA rules

- Define the variants constant outside the component — it is not recreated on each render.
- Export the variants function separately when other components need to compose it.
- Always define `defaultVariants` so the component works without explicit props.
- Use `compoundVariants` for styles that apply only when two variants combine — not nested ternaries.

```ts
compoundVariants: [
  { variant: "ghost", size: "sm", class: "text-xs" },
],
```

---

## Tailwind conventions

### Scale discipline

Use Tailwind's default scale. Do not use arbitrary values (`w-[372px]`, `mt-[13px]`) unless the value comes from an external constraint. When unavoidable, document the reason inline:

```tsx
{/* Fixed by the Embla carousel container requirement */}
<div className="h-[420px]">
```

### Responsive utilities

Mobile-first: write the base class for mobile, add prefixes for larger screens.

```tsx
// Correct
<div className="flex flex-col gap-4 md:flex-row md:gap-8" />

// Wrong — no mobile consideration
<div className="flex flex-row gap-8" />
```

### No inline styles for layout

Use Tailwind utilities for all spacing, sizing, and layout. Inline `style` is permitted only for values that are genuinely dynamic and cannot be expressed as a Tailwind class.

```tsx
// Wrong
<div style={{ marginTop: "16px", display: "flex" }} />

// Correct
<div className="mt-4 flex" />

// Acceptable — dynamic value from data
<div style={{ width: `${progress}%` }} />
```
