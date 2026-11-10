# Preamble

> Read this before every task, no exceptions. Contains the minimum rules that apply to every file you touch.

---

## Before starting — fetch the relevant doc

The routing table ("if your task involves X, read Y") is the Labsky index, `docs/INDEX.md`, which the plugin loads at the start of every session. After reading this file, fetch every doc the index lists for your task. Several may apply.

---

## Project structure

Every feature lives at `src/features/[feature-name]/`. Create subfolders only when the feature needs them:

```
src/features/[feature-name]/
  components/    → UI pieces owned by this feature
  constants/     → enums, static configs, fixed data
  hooks/         → feature-specific logic and state
  lib/           → configured third-party adapters
  queries/       → TanStack Query queryOptions definitions
  schemas/       → Valibot validation schemas
  services/      → raw API call functions
  stores/        → feature-scoped Zustand state
  types/         → TypeScript types shared across the feature
  utils/         → pure stateless helper functions
  tests/         → test files for this feature
```

Route files live at `src/routes/` and mirror the URL structure exactly. Do not write route definitions by hand — TanStack Router generates them from the file tree.

---

## File naming

kebab-case only. Pattern: `[descriptive-name].[type].ext`

| Type suffix | Extension | Example |
|---|---|---|
| `.component` | `.tsx` | `user-profile-card.component.tsx` |
| `.hook` | `.ts` | `use-auth-user.hook.ts` |
| `.service` | `.ts` | `vehicle.service.ts` |
| `.query` | `.ts` | `vehicle.query.ts` |
| `.schema` | `.ts` | `user-auth.schema.ts` |
| `.store` | `.ts` | `quote.store.ts` |
| `.lib` | `.ts` | `axios.lib.ts` |
| `.type` | `.ts` | `vehicle.type.ts` |
| `.constant` | `.ts` | `steps.constant.ts` |
| `.util` | `.ts` | `maskito.util.ts` |
| `.test` | `.ts` / `.tsx` | `vehicle.service.test.ts` |

Route files follow TanStack Router conventions — no type suffix: `index.tsx`, `$slugProductCategory.tsx`.

---

## Naming conventions

| Entity | Convention | Example |
|---|---|---|
| Component function | `PascalCase` | `UserProfileCard` |
| Hook function | `camelCase`, `use` prefix mandatory | `useAuthUser` |
| TypeScript type | `PascalCase` | `VehicleResponse` |
| Constant variable | `SCREAMING_SNAKE_CASE` | `STEP_CODES` |
| All other variables and functions | `camelCase` | `getVehicleData` |
| Feature folder | `kebab-case` | `seguro-vehiculo` |
| Route file / folder | `camelCase`, mirrors URL | `$slugProductCategory/` |

---

## Imports

- **No barrel files.** `index.ts` re-exports are forbidden everywhere.
- **`@/` alias is mandatory for all imports.** It resolves to `src/`. Relative paths (`../`, `./`) are forbidden everywhere — no exceptions.
- **`@strategies` alias** resolves to `src/strategies/`. Use it only inside registry files when importing strategy files. Strategy files themselves use `@/`.
- Import directly from the exact file:

```ts
// Correct — always use @/ alias
import { useQuoteStore } from "@/features/quotes/stores/quote.store";
import { STEP_CODES } from "@/features/steps/constants/steps.constant";
import { UserProfileCard } from "@/features/users/components/user-profile-card.component";
import { cn } from "@/lib/cn.lib";
import { env } from "@/config/env";

// Correct — @strategies alias in registry files only
import { seguroVehiculoProductCategoryStrategy } from "@strategies/product-categories/seguro-vehiculo.product-category.strategy";

// Wrong — relative paths are forbidden
import { useQuoteStore } from "../stores/quote.store";
import { STEP_CODES } from "../../steps/constants/steps.constant";
```

The file path is the contract. If a file moves, the import breaks loudly — that is correct behaviour. The `@/` alias ensures this happens regardless of how deeply nested the importing file is.

---

## Exports

- **Named exports only.** Default exports are forbidden everywhere — components, hooks, utilities, constants, types, everything.
- Import only what is needed — never import an entire module.

---

## TypeScript invariants

| Rule | Detail |
|---|---|
| `any` | Forbidden as a variable, prop, or return type. Only permitted as a bound in a generic: `<T extends Record<string, any>>`. Escalate to a human if needed elsewhere. |
| `as` casting | Forbidden except for broken external library types where the library's types are provably wrong. |
| `interface` | Forbidden. Use `type` for everything — props, object shapes, API responses, store state, unions, intersections. |
| Inference | Let TypeScript infer where the type is obvious. No redundant annotations. |

---

## Stack at a glance

| Layer | Tool |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Package manager | pnpm — only allowed package manager |
| Router | TanStack Router (file-based) |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | React Hook Form + @hookform/resolvers |
| Validation | Valibot |
| HTTP | Axios |
| UI base | shadcn/ui (Radix Nova) |
| Icons | Lucide React |
| Styling | Tailwind CSS v4 + CVA + tailwind-merge + clsx |
| Animations | Motion (simple) / GSAP (complex) |
| Input masking | Maskito |
| Date utilities | date-fns |
| Lint + format | Biome |
| Carousel | Embla Carousel |
| Scaffolding | Internal CLI |

Full stack rules and decisions live in the `docs/frontend/` docs (and `docs/backend/`, `docs/infra/` for server work). The table above is orientation only.

---

## Package manager

**pnpm is the only allowed package manager.** Never run `npm install`, `yarn add`, or any equivalent.

```bash
# Correct
pnpm install
pnpm add valibot
pnpm run build
pnpm dlx tsx script.ts

# Wrong — blocked by the preinstall check and the plugin's pre-bash hook
npm install
yarn add valibot
npx tsx script.ts
```

---

## Escalation

- Can't express validation logic with `.check()`? → escalate to a human.
- Need `any` outside a generic bound? → escalate to a human.
- About to introduce a pattern not seen in this codebase? → fetch `docs/never/no-go-list.md` first.
