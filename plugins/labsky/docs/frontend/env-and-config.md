# Env & Config

> Read when: adding or modifying environment variables, reading config in a feature, or configuring Biome.

---

## Environment variables

All environment variables use the `VITE_` prefix and are consumed exclusively via a single typed config object at `src/config/env.ts`. Direct use of `import.meta.env` anywhere else in the codebase is forbidden.

```ts
// src/config/env.ts
import { parse, object, string, pipe, url } from "valibot";

const envSchema = object({
  apiBaseUrl: pipe(string(), url()),
  appEnv: string(),
  recaptchaSiteKey: string(),
  gaMeasurementId: string(),
  hotjarId: string(),
});

export const env = parse(envSchema, {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  appEnv: import.meta.env.VITE_APP_ENV,
  recaptchaSiteKey: import.meta.env.VITE_PUBLIC_RECAPTCHA_SITE_KEY,
  gaMeasurementId: import.meta.env.VITE_PUBLIC_GA_MEASUREMENT_ID,
  hotjarId: import.meta.env.VITE_PUBLIC_HOTJAR_ID,
});
```

**Rules:**
- All variables are validated at startup via Valibot. An invalid or missing variable throws immediately — never silently falls back to `undefined`.
- `.env` file naming: `SCREAMING_SNAKE_CASE` with `VITE_` prefix → `VITE_API_BASE_URL`.
- Config object keys: `camelCase` → `env.apiBaseUrl`.
- Never commit `.env` files. Always commit `.env.example` with every variable present but empty.
- Features access config by importing from `@/config/env` — never by reading `import.meta.env` directly.
- `VITE_PUBLIC_` prefix is used for values that are intentionally public (third-party site keys). Never use this prefix for secrets.

---

## .env file hierarchy

Vite loads `.env` files in this order (later overrides earlier):

```
.env               → base, committed as .env.example
.env.local         → local overrides, gitignored
.env.[mode]        → mode-specific (development, staging, production)
.env.[mode].local  → mode-specific local overrides, gitignored
```

Commit only `.env.example`. All other `.env*` files must be in `.gitignore`.

---

## Adding a new variable

1. Add it to `.env.example` with an empty value and a comment describing its purpose.
2. Add the Valibot schema entry in `src/config/env.ts`.
3. Add the key mapping in the `parse()` call.
4. Export it from the `env` object.
5. Consume it via `import { env } from "@/config/env"` in the relevant feature.

Never skip step 1 — a variable present in code but absent from `.env.example` is invisible to the next developer setting up the project.

---

## Biome — linting and formatting

Biome is the single tool for linting, formatting, and import organisation. Do not install or configure ESLint or Prettier alongside it.

### Formatting rules

| Setting | Value |
|---|---|
| Indent style | Spaces |
| Indent width | 2 |
| Line ending | LF |
| Quote style | Double |
| JSX quote style | Double |
| Trailing commas | Always |
| Semicolons | Always |
| Arrow parentheses | Always |
| Bracket same line | No |
| Bracket spacing | Yes |

### Linter

Biome's recommended ruleset is enabled. The following rules are explicitly activated on top of it:

| Rule | Why |
|---|---|
| `noDefaultExport` | Named exports only, enforced at the tool level |
| `noConsole` | No `console.log` in committed code |
| `noRestrictedImports` for `import.meta.env` outside `src/config/env.ts` | All env access goes through the typed config object |

Do not suppress rules with `// biome-ignore` without a documented reason written inline.

### Import organisation

Biome's `organizeImports` runs automatically. Do not manually order imports or add blank lines between import groups.

### Scope

Biome runs on `src/**/*.{js,jsx,ts,tsx}`. The generated route tree (`src/routeTree.gen.ts`) is explicitly excluded — never edit or lint it manually.
