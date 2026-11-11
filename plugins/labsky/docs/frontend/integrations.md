# Integrations

> Read when: working with reCAPTCHA, Google Analytics, Hotjar, or adding any new third-party service.

---

## General rules for all integrations

- All integration configuration keys live in `src/config/env.ts` — never hardcoded.
- Integrations are initialised once, at the application entry point (`src/main.tsx` or a root provider) — never inside components.
- Never call third-party SDK globals directly (`grecaptcha`, `gtag`, `hj`) — always use the wrapper hook or helper defined in the project.
- Integrations are disabled in development unless explicitly overridden — check `env.appEnv` or `import.meta.env.PROD`.

---

## vite-plugin-radar

`vite-plugin-radar` is the single initialisation point for Google Analytics and Hotjar. It injects the vendor scripts at build time — **production builds only**. Do not add manual script tags or SDK initialisations for any service this plugin supports.

### Configuration (`vite.config.ts`)

```ts
import { VitePluginRadar } from "vite-plugin-radar";
import { loadEnv } from "vite";

VitePluginRadar({
  analytics: {
    id: loadEnv("", process.cwd()).VITE_GOOGLE_ANALYTICS_ID,
  },
  hotjar: {
    id: Number(loadEnv("", process.cwd()).VITE_HOTJAR_ID),
  },
})
```

**Rules:**
- Use `loadEnv("", process.cwd())` — not `import.meta.env` — because `vite.config.ts` runs at build time, outside the module graph.
- The empty string as the first argument loads vars from `.env` regardless of mode, which is correct here.
- Hotjar requires a `number` — always wrap with `Number()`.
- Analytics ID is a string — pass it directly.
- Each service key maps 1:1 to a vendor. Check the [plugin docs](https://github.com/stafyniaksacha/vite-plugin-radar) before adding a new supported service; if it is listed, use the plugin — do not add a manual script.
- For services **not** supported by the plugin, follow the "Adding a new third-party integration" steps below.

### Env vars

| Variable | Type | Used by |
|---|---|---|
| `VITE_GOOGLE_ANALYTICS_ID` | `string` | Google Analytics |
| `VITE_HOTJAR_ID` | `string` (cast to `number`) | Hotjar |

Both must be present in `.env.example` with empty values. In development they can be left empty — the plugin does not inject scripts in dev mode.

---

## Google reCAPTCHA

### Version

Use reCAPTCHA v3 (invisible) by default. Use v2 checkbox only if UX explicitly requires human confirmation.

### Token flow

The client generates a token. The token is sent to the backend. The backend validates the token with Google's API. The client never validates the token — it only passes it.

```ts
// Correct usage via hook
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

const { executeRecaptcha } = useGoogleReCaptcha();

const handleSubmit = async (data: FormData) => {
  if (!executeRecaptcha) return;
  const token = await executeRecaptcha("form_submit");
  await submitMutation.mutateAsync({ ...data, recaptchaToken: token });
};
```

**Rules:**
- Generate a new token per submit — never cache or reuse tokens.
- The action string (`"form_submit"`) must describe the user action — it appears in the reCAPTCHA dashboard.
- Never interpret the score client-side. Backend rejects low-score requests with a standard error — the client shows a generic failure message, never "reCAPTCHA failed."
- reCAPTCHA is required on all public-facing forms: contact, registration, quote initiation.

---

## Google Analytics

### Event tracking

Use the project's `trackEvent()` helper — never call `gtag()` directly. The helper enforces the event schema and prevents PII leaks.

```ts
// Correct
import { trackEvent } from "@/features/analytics/lib/analytics.lib";
trackEvent("cotizacion_iniciada", { producto: "seguro_auto" });

// Wrong — bypasses the wrapper
gtag("event", "cotizacion_iniciada", { email: user.email });
```

**Rules:**
- Never send PII (name, email, RUT, phone) as event parameters.
- Never send financial data as event parameters.
- Track on explicit user interactions — not on every render or effect.
- Events fire only in production (`import.meta.env.PROD`). The `vite-plugin-radar` config already handles this — do not add manual checks unless overriding default behaviour.

### Custom event schema

Event names: `snake_case`, descriptive, domain-prefixed — `cotizacion_iniciada`, `pago_completado`, `documento_descargado`.

Event parameters: `snake_case`, no PII, maximum 25 characters per key name.

---

## Hotjar

### Initialisation

Hotjar initialises via `vite-plugin-radar` — not via manual script injection. Do not add a second initialisation.

### Suppressing recording on sensitive pages

Suppress Hotjar recording on pages that display personal, financial, or medical data:

```tsx
import { useEffect } from "react";

// Inside the component of a sensitive page
useEffect(() => {
  if (window.hj) window.hj("stateChange", "suppress");
  return () => {
    if (window.hj) window.hj("stateChange", "resume");
  };
}, []);
```

Sensitive pages that require suppression: checkout, payment confirmation, document viewer, profile with RUT or policy details.

### Identify API

Only call `hj("identify", ...)` if the user has explicitly consented to personalised tracking. When called, never include PII beyond an anonymised user ID.

---

## Adding a new third-party integration

Before adding any new integration:

1. **Bundle impact:** run `pnpm build` and check the output — is the added size acceptable?
2. **Privacy impact:** does the SDK collect user data? Does it require consent?
3. **Initialisation:** does it need to be a root provider or a one-time setup in `main.tsx`?
4. **Wrapper:** define a typed wrapper in `src/lib/[service].lib.ts` — features consume the wrapper, not the SDK directly.
5. **Env vars:** add to `src/config/env.ts` and `.env.example`.
6. **No-go check:** if the integration is analytics or tracking, confirm it does not need to be added to `docs/never/no-go-list.md` restrictions.

Do not install additional analytics or tracking SDKs without team approval. Each one increases bundle size, privacy surface area, and compliance scope.
