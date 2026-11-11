# Architecture

> Read when: creating or modifying a feature, adding a service, query, or store, or deciding where a file belongs.

---

## Screaming Architecture

The folder structure must make the app's domain instantly readable to a newcomer without opening any file. Every meaningful unit of functionality is a self-contained folder under `src/features/`.

---

## Feature folder decision table

| Folder | Purpose | Create when… |
|---|---|---|
| `components/` | UI pieces (Compound/Lego pattern) | The feature owns at least one rendered element |
| `constants/` | Enums, static configs, fixed data | Magic values exist that need a name |
| `hooks/` | Custom hooks reused or complex | Hook is reused across 2+ components, or too complex to inline in a single component |
| `lib/` | Configured third-party adapters | A library needs a configured instance before it can be used |
| `queries/` | TanStack Query `queryOptions` definitions | The feature fetches async data |
| `schemas/` | Valibot validation schemas | User input or external data needs validation |
| `services/` | Raw API call functions | The feature communicates with an external API |
| `stores/` | Feature-scoped Zustand state | State is too complex for `useState` but does not need to be shared globally |
| `types/` | TypeScript type definitions | Types are shared across more than one file in the feature |
| `utils/` | Pure helper functions | Custom stateless utility functions the feature uses internally |
| `tests/` | Test files | Any file in the feature has tests |

---

## Hook placement rule

A hook belongs in the feature's `hooks/` folder when **either** condition is true:
- It is used by 2 or more components.
- It is too complex to read inline inside a component file.

When a hook is guaranteed to be used only inside a single component and is simple enough to follow inline, it may live in that component's file. In that case it must **not** be exported — it is a private implementation detail of that file.

```ts
// ✅ Simple, single-use — stays in the component file, never exported
function useLocalToggle() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen(v => !v) };
}

// ✅ Reused or complex — moves to features/[feature]/hooks/
// src/features/plans/hooks/use-plan-selection.hook.ts
export function usePlanSelection() { ... }
```

---

## `utils/` vs `lib/`

| Folder | What goes here | What does NOT go here |
|---|---|---|
| `utils/` | Pure, stateless custom helper functions — formatters, transformers, mask configs, calculators | Anything that instantiates or configures a third-party library |
| `lib/` | Configured instances of third-party tools — Axios instance, QueryClient, Router | Business logic, formatting helpers, pure functions |

```ts
// utils/ — pure custom function, no external library setup
export function formatCurrency(amount: number): string { ... }

// lib/ — configured third-party adapter
export const axiosBasic = Axios.create({ timeout: API_TIMEOUT });
```

If a helper imports and calls a library but does not configure an instance (e.g. a Maskito mask option object), it belongs in `utils/`.

---

## Global `src/` folders — cross-feature code

When a utility, hook, or type is not owned by any single feature and is shared across two or more features, it does not go into any feature folder. It goes into the corresponding root-level folder under `src/`:

| Folder | Purpose |
|---|---|
| `src/utils/` | Pure helper functions used across features |
| `src/hooks/` | Custom hooks used across features |
| `src/types/` | TypeScript types shared across features |
| `src/lib/` | Global configured adapters (e.g. shadcn component re-exports) |
| `src/components/` | UI components not owned by any feature |

**Rule:** start inside the feature. Move to a global folder only when a second feature needs the same file. Do not pre-emptively place code globally.

---

## Hard boundaries between layers

### `lib/` vs `services/`

- **`services/`** owns the fetch logic. Calls the configured HTTP client, returns typed data. Nothing in `services/` knows about TanStack Query.
- **`lib/`** owns the configured adapter. Creates and exports the tool `services/` uses.

```
services/vehicle.service.ts   → calls axiosBasic.get("/vehiculos", ...)
lib/axios.lib.ts              → creates and exports the axiosBasic instance
```

A service imports from `lib/`. `lib/` never imports from `services/`.

### `queries/` vs `services/`

- **`services/`** is a plain async function. Fetches and returns data. No TanStack Query awareness.
- **`queries/`** wraps a service call inside `queryOptions()`. Owns the `queryKey` and `queryFn`. Never fetches directly.

```ts
// services/vehicle.service.ts
async function getVehicle(params: GetVehicleParams) {
  const { data } = await axiosBasic.get<ApiResponse<GetVehicleResponseData>>("/vehiculos", { params });
  return data;
}

// queries/vehicle.query.ts
function getVehicleQueryOptions(params: GetVehicleParams) {
  return queryOptions({
    queryKey: ["getVehicle", params],
    queryFn: () => getVehicle(params),
  });
}
```

---

## State management tiers

Choose the lowest tier that satisfies the requirement.

| Tier | Tool | When to use |
|---|---|---|
| Local | `useState` | State is strictly contained within a single component |
| Scoped | React Context | Shared state between parts of a Compound Component — never exported outside the file |
| Feature / Global | Zustand | State shared across components or features |
| Server | TanStack Query | All async data — single source of truth for anything fetched from an API |

> **Zustand** is the standard. See `docs/frontend/state-management.md` for patterns and conventions.

---

## Cross-feature state ownership

Global state lives inside the feature that semantically owns it (`src/features/[owner]/stores/`). Other features import directly from that file using `@/`. There is no root-level `src/stores/` folder.

---

## Cross-feature imports

No barrel files. Import directly from the exact file:

```ts
import { BlacklistVerificationDialog } from "@/features/blacklist/components/blacklist-verification-dialog.component";
import { getProductCategoryBySlugQueryOptions } from "@/features/products/queries/products.query";
import { useQuoteStore } from "@/features/quotes/stores/quote.store";
import { STEP_CODES } from "@/features/steps/constants/steps.constant";
```

If a file moves, the import breaks loudly — that is correct behaviour. Never create an `index.ts` to smooth that over.

---

## Strategy and Registry pattern

Product-specific UI and data-transformation logic is isolated using a strategy pattern. Two root-level folders own all of it:

```
src/
  strategies/
    product-categories/      → one strategy file per product category
    steps/
      [product-category]/    → static step strategies for that category
        [insurer-name]/      → backend/insurer-specific step strategies
  registries/
    product-categories/      → maps ProductCategoryCode → strategy
    steps/                   → merges static + backend step strategies into one lookup
```

These folders live at root level — not inside any feature — because strategies cross multiple features (forms, components, schemas, types). Placing them inside a feature would create import cycles.

---

### Two kinds of step strategies

**Static steps** are defined per product category and are always present regardless of what the backend returns (e.g. the product form, personal data form, estimate screen).

**Backend steps** are returned by the API after a plan is selected (e.g. an insurer-specific confirmation form). They are grouped by product category and insurer name under `src/strategies/steps/[product-category]/[insurer-name]/`.

---

### Four step strategy variants

TypeScript narrows the variant automatically from the fields passed to `createStepStrategy()`:

| Has form | Has API response | Variant |
|---|---|---|
| No | No | `StepWithoutFormWithoutResponse` |
| No | Yes | `StepWithoutFormWithResponse` |
| Yes | No | `StepWithFormWithoutResponse` |
| Yes | Yes | `StepWithFormWithResponse` |

---

### Factory functions — always use them

Never write a raw object as a strategy. Always use the factory — it gives TypeScript the information it needs to derive the types of `getBody`, `getFormValues`, `getPersonalDataForQuote`, and `getProductDataForQuote` from `formSchema`.

```ts
// Step strategy
import { createStepStrategy } from "@/features/steps/utils/steps-strategy.util";

const myStepStrategy = createStepStrategy({
  Component: ({ children }) => <MyLayout>{children}</MyLayout>,
  FormComponent: ({ defaultValues }) => <MyForm defaultValues={defaultValues} />,
  formSchema: myFormSchema,
  getBody: (formValues) => ({ field: formValues.field }),
  getFormValues: (recoveredData) => ({ field: recoveredData.field }),
});

// Product category strategy
import { createProductCategoryStrategy } from "@/features/products/utils/products.util";

const myProductCategoryStrategy = createProductCategoryStrategy({
  staticSteps: {
    MY_STEP: {
      metadata: { idPasoPlan: -1, esDeshabilitado: false, mostrarPasos: true, nombre: "Mi Paso" },
      strategy: myStepStrategy,
    },
  },
  dataMapping: {
    personalDataStep: "MY_PERSONAL_STEP",
    productDataStep: "MY_STEP",
  },
});
```

---

### Registries — the only way to access strategies in application code

Never import a strategy directly in components, hooks, or utilities. Always use the registry accessor:

```ts
// Correct — go through the registry
import { getStepStrategy } from "@/registries/steps/step.registry";
import { getProductCategoryStrategy } from "@/registries/product-categories/product-category.registry";

const stepStrategy = getStepStrategy(stepCode);
const categoryStrategy = getProductCategoryStrategy(categoryCode);

// Wrong — bypasses the registry, breaks type narrowing
import { seguroVehiculoStepStrategy } from "@strategies/steps/seguro-vehiculo/seguro-vehiculo.step.strategy";
```

Strategy files themselves import from features using `@/`. Registry files import from strategies using `@strategies`.

---

### File naming conventions

| File type | Pattern | Example |
|---|---|---|
| Product category strategy | `[product-category].product-category.strategy.tsx` | `seguro-vehiculo.product-category.strategy.tsx` |
| Static step strategy | `[product-category].step.strategy.tsx` | `seguro-vehiculo.step.strategy.tsx` |
| Backend step strategy | `[insurer].[product-category].[step-type].step.strategy.tsx` | `aseguradora-example.seguro-vehiculo.personal.step.strategy.tsx` |
| Step registry | `[product-category].step.registry.ts` | `seguro-vehiculo.step.registry.ts` |

---

### Adding a new product category

1. Create step strategies under `src/strategies/steps/[product-category]/`.
2. Create the product-category strategy at `src/strategies/product-categories/[product-category].product-category.strategy.tsx`.
3. Register it in `src/registries/product-categories/product-category.registry.ts`.
4. TypeScript will error if any `ProductCategoryCode` value is unregistered.

### Adding a new backend step (insurer-specific)

1. Create the step strategy under `src/strategies/steps/[product-category]/[insurer-name]/`.
2. Add it to the corresponding step registry file under `src/registries/steps/`.

---

## Internal CLI — use before creating files manually

The project includes an internal CLI for scaffolding features. Before creating any feature folder or file manually, check whether the CLI can generate it.

```bash
pnpm scaffold feature <feature-name>
```

This generates the correct folder structure under `src/features/[feature-name]/` with the expected subfolders and placeholder files following all naming conventions.

**Rules:**
- Always run the scaffold command first when creating a new feature.
- If the scaffolded output does not match what the task needs, remove the unneeded folders — do not create a parallel structure alongside the scaffolded one.
- Do not deviate from the scaffolded structure without a documented reason.
- The CLI does not scaffold route files — those are generated by TanStack Router from the file tree. Create route files manually following the conventions in `docs/frontend/routing.md`.
