# No-Go List

> Check this before introducing a pattern not seen elsewhere in the codebase. If something you are about to do appears here, stop and escalate to a human.

---

## Architecture

| Do not | Why |
|---|---|
| Create a root-level `src/stores/` folder | Cross-feature state lives in the owning feature's `stores/` |
| Write TanStack Router route definitions by hand | The file tree generates them — hand-written definitions drift and conflict |
| Edit `src/routeTree.gen.ts` | Auto-generated — any manual edit will be overwritten on next dev server start |
| Use dot-notation for route files (`cotizar.$slug.tsx`) | Obscures hierarchy — always use folders |

---

## TypeScript

| Do not | Why |
|---|---|
| Use `any` as a variable, prop, or return type | Defeats type safety; escalate to a human instead |
| Use `as` casting outside of broken external library types | Masks real type errors — fix the type, don't cast around it |
| Use `interface` for any type definition | `type` is the universal standard — `interface` is forbidden |
| Use default exports | Breaks named import consistency and refactoring tooling |
| Add redundant type annotations where TypeScript can infer | Noise that makes code harder to read |

---

## Imports

| Do not | Why |
|---|---|
| Use relative paths (`../`, `./`) for imports | `@/` alias is mandatory — relative paths break when files move and obscure the true path |
| Create `index.ts` barrel files | Breaks tree-shaking, risks circular deps, adds maintenance overhead with no benefit |
| Import an entire module when only a named export is needed | Import only what is used |

---

## Validation

| Do not | Why |
|---|---|
| Use Zod or Yup | Valibot is the only validation library |
| Use `.refine()` in Valibot schemas | Bypasses type inference and creates runtime overhead; use `.check()` |
| Write a `type` for an API response without a Valibot schema | Schema-first is required — type is derived, never written manually |

---

## Components

| Do not | Why |
|---|---|
| Use `React.FC` | Obscures return type, complicates generics; declare props directly in the function signature |
| Use inline `style` attributes for layout | Use Tailwind utilities |
| Use arbitrary Tailwind values (`w-[372px]`) without a documented reason | Breaks design scale consistency |
| Use a `<div>` where a semantic element is appropriate | Harms accessibility and SEO |
| Put business logic or data-fetching in a page component | Page components are composition roots only |
| Export React Context from a component file | Context is an implementation detail — scoped to the file, never exported |

---

## Data fetching

| Do not | Why |
|---|---|
| Fetch directly inside a `queries/` file | Queries wrap services — services own the fetch |
| Import from TanStack Query inside a `services/` file | Services are plain async functions with no query awareness |
| Fetch directly inside a route loader | Loaders use `queryClient.ensureQueryData()` with query options |
| Swallow or transform errors inside TanStack Query | Let errors propagate naturally to the component layer |
| Copy query data into `useState` | Creates two sources of truth that drift immediately |

---

## Forms

| Do not | Why |
|---|---|
| Wire form validation manually instead of using `valibotResolver` | The resolver keeps the schema and form state in sync automatically |
| Render a bare `<form>` tag without the shadcn `<Form />` wrapper | `<Form />` is required for all forms — no exceptions |
| Use `register` or `Controller` directly inside a `<Form />` | Use `<FormField>` — it wraps `Controller` and wires errors and accessibility automatically |
| Use `useState` to track field values | RHF owns form state — `useState` creates a second source of truth |
| Use `useEffect` to sync form values to external state | Use `watch()` or `useWatch()` instead |
| Define the Valibot schema inline in the component file | Schema lives in `schemas/[name]-form.schema.ts` |
| Show server field errors in a toast | Field errors belong inline below the field via `form.setError()` |
| Use `register` for Maskito-masked inputs | Masked inputs require `Controller` for correct value transformation |

---

## State

| Do not | Why |
|---|---|
| Migrate existing Zustand stores without an explicit task scope | Unscoped migrations create unfinished work |
| Store server state in `useState` | TanStack Query is the single source of truth for all async data |

---

## Tooling

| Do not | Why |
|---|---|
| Install or configure ESLint or Prettier | Biome replaces both |
| Suppress Biome rules with `// biome-ignore` without an inline reason | Rules exist for a reason; document the exception |
| Read `import.meta.env` directly outside `src/config/env.ts` | All env access goes through the typed config object |
| Commit `.env` files | Secrets must never be committed; commit `.env.example` instead |

---

## Commits and Git

| Do not | Why |
|---|---|
| Mix more than one concern in a single commit | One concern per commit — keeps history bisectable |
| Write commit messages in past tense (`added`, `fixed`) | Conventional Commits requires imperative mood (`add`, `fix`) |
| Omit the scope | Scope is required — `feat: add thing` is rejected by commitlint |
| Bypass Husky with `--no-verify` in normal workflow | Hooks exist to enforce standards; bypass only in documented emergencies |
| Commit directly to `main`, `staging`, or `dev` | All changes arrive via PR |
| Merge feature branches directly into `staging` | `staging` only receives merges from `dev` |

---

## State management

| Do not | Why |
|---|---|
| Subscribe to the entire Zustand store without a selector | Re-renders on every state change regardless of what the component uses |
| Store server state in Zustand | TanStack Query is the single source of truth for all async data |
| Store derived values in state | Compute during render — do not store what can be calculated |
| Define actions outside the store creator | Actions belong inside `create()` — not as external functions |
| Use `persist` middleware for tokens or sensitive data | Persisted storage is accessible to XSS — never persist secrets |

---

## Authentication

| Do not | Why |
|---|---|
| Store tokens in `localStorage` or `sessionStorage` | Accessible to XSS — use memory store for access tokens, httpOnly cookie for refresh tokens |
| Log or expose tokens in console, errors, or responses | Tokens are secrets — treat them as such |
| Handle 401s in individual queries | The Axios interceptor owns 401 handling globally |
| Reveal whether a user account exists in error messages | Prevents user enumeration attacks |
| Implement auth checks only client-side | Server-side validation is always required |

---

## Animations

| Do not | Why |
|---|---|
| Use `useEffect` to run GSAP animations | `useGSAP` from `@gsap/react` handles context and cleanup correctly |
| Animate `width`, `height`, `top`, `left`, or `margin` | These trigger layout recalculation every frame — animate `transform` and `opacity` |
| Define Motion variants inline in JSX | New object reference on every render — define outside the component |
| Use class selectors in GSAP without a scope ref | Selectors match globally — always scope to a container ref |

---

## API layer

| Do not | Why |
|---|---|
| Call `axios.get()` or `axios.post()` directly | Always use a named instance from `lib/` |
| Add interceptors inside a component or hook | Interceptors belong with the instance configuration |
| Put `try/catch` inside a service function | Let errors propagate to TanStack Query |
| Return `AxiosResponse<unknown>` from a service | Parse and type the response before returning |
| Import TanStack Query inside a `services/` file | Services are pure async functions with no query awareness |

---

## Integrations

| Do not | Why |
|---|---|
| Call `grecaptcha`, `gtag`, or `hj` directly | Always use the project wrappers — `trackEvent()`, the reCAPTCHA hook |
| Send PII in Analytics event parameters | Privacy violation — use anonymised identifiers only |
| Validate reCAPTCHA tokens client-side | Token validation is always server-side |
| Add analytics or tracking SDKs without team approval | Increases bundle size, privacy surface, and compliance scope |

---

## Styling

| Do not | Why |
|---|---|
| Use arbitrary Tailwind values (`w-[372px]`) without a documented reason | Breaks design scale consistency |
| Use string concatenation for conditional classes | Use `cn()` from `@/lib/cn.lib` — it handles conflicts via tailwind-merge |
| Call `clsx` or `twMerge` directly in components | Always use the `cn()` helper |
| Use inline `style` for layout values | Use Tailwind utilities — inline style only for truly dynamic values |
| Create `tailwind.config.js` | Tailwind v4 uses CSS-based configuration — config file is not used |


---

## Internal tooling

| Do not | Why |
|---|---|
| Create feature folders and files manually when the CLI can scaffold them | `pnpm scaffold feature <name>` generates the correct structure automatically |
| Deviate from the scaffolded file structure without a documented reason | Consistency enables tooling and onboarding |
