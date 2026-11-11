# API Layer

> Read when: making HTTP calls, configuring Axios, writing services, or handling API errors.

---

## Layer boundaries

The API layer has three distinct responsibilities. Each layer knows nothing about the layer above it.

```
src/features/axios/lib/axios.lib.ts   → creates and configures the Axios instance
services/[x].service.ts               → raw fetch functions — calls the Axios instance, returns typed data
queries/[x].query.ts                  → wraps services in queryOptions — TanStack Query integration
```

A service imports from `src/features/axios/`. `services/` never imports from `queries/`. `queries/` never fetches directly — always calls a service.

---

## Axios instance

The Axios instance lives at `src/features/axios/lib/axios.lib.ts`. The instance is named `axiosBasic`.

```ts
// src/features/axios/lib/axios.lib.ts
import { notFound } from "@tanstack/react-router";
import Axios, { isAxiosError } from "axios";
import { API_TIMEOUT } from "@/features/axios/constants/axios.constant";
import { useQuoteStore } from "@/features/quotes/stores/quote.store";

export const axiosBasic = Axios.create({
  timeout: API_TIMEOUT,
  ...
});
```

The timeout constant is defined in `src/features/axios/constants/axios.constant.ts`:

```ts
const API_TIMEOUT = 10 * 1000; // 10 seconds
export { API_TIMEOUT };
```

Never call `axios.get()` or `axios.post()` directly in a service. Always use `axiosBasic`.

---

## Interceptors

Interceptors are configured once, alongside the Axios instance. They are never added inside components or hooks.

### Request interceptor — attach context headers

```ts
axiosBasic.interceptors.request.use((config) => {
  const currentAlly = useQuoteStore.getState().currentAlly;
  const currentOperator = useQuoteStore.getState().currentOperator;

  config.headers["X-Aliado-Code"] = currentAlly;
  config.headers["X-Operador-Code"] = currentOperator;

  return config;
});
```

Every request carries the current ally and operator from `useQuoteStore`. These values are read with `.getState()` — never subscribe inside an interceptor.

### Response interceptor — handle known error statuses

```ts
axiosBasic.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw notFound();
      }

      if (error.response?.status === 451) {
        useQuoteStore.setState({ isBlacklisted: true });
      }
    }

    return Promise.reject(error);
  },
);
```

| Status | Behaviour |
|---|---|
| `404` | Throws TanStack Router's `notFound()` — triggers the nearest `notFoundComponent` |
| `451` | Sets `isBlacklisted: true` in `useQuoteStore` |
| Everything else | `Promise.reject(error)` — propagates to TanStack Query |

---

## Types

```ts
// src/features/axios/types/axios.type.ts

type ApiResponse<T> = {
  statusCode: number;
  title: string;
  message: string;
  success: boolean;
  data: T;
};

type Pagination = {
  totalPages: number;
  page: number;
};

export type { ApiResponse, Pagination };
```

`ApiResponse<T>` is the envelope for all successful responses. `Pagination` is used alongside `ApiResponse` when an endpoint returns paginated data.

---

## Services

Services are plain async functions. They call `axiosBasic`, type the response with `ApiResponse<T>`, and return the full response object. They have no knowledge of TanStack Query.

```ts
// src/features/vehicle/services/vehicle.service.ts
import { axiosBasic } from "@/features/axios/lib/axios.lib";
import type { ApiResponse } from "@/features/axios/types/axios.type";
import type { GetVehicleTypesResponseData } from "@/features/vehicle/types/vehicle.type";

async function getVehicleTypes() {
  const { data } = await axiosBasic.get<ApiResponse<GetVehicleTypesResponseData>>(
    `/clg/tipos-vehiculos`,
  );
  return data;
}

export { getVehicleTypes };
```

**Rules:**
- Destructure Axios's response with `const { data }` — this is the `ApiResponse<T>` envelope.
- Return `data` (the full `ApiResponse<T>` object). Do not unwrap `data.data` in the service — callers work with the full envelope.
- Never put `try/catch` inside a service. Let errors propagate to TanStack Query, which surfaces them to the component layer.
- Services are named exports, never default exports.

---

## Error propagation model

```
Service throws → AxiosError propagates
  ↓
Response interceptor handles 404 / 451
  ↓
TanStack Query catches remaining errors → exposes via query.error
  ↓
Component layer handles it:
  - Unrecoverable → React Error Boundary
  - Recoverable   → Toast
  - Field-level   → Inline below the input
```

Never swallow errors inside TanStack Query. Let them propagate naturally. See `docs/frontend/data-and-validation.md` for the full error handling hierarchy.

---

## Query and mutation meta — toast routing

All error and success toasts are handled centrally in `src/features/tanstack-query/lib/tanstack-query.lib.ts` via `QueryCache` and `MutationCache`. **This is mandatory — do not add toast calls inside individual queries, mutations, or components.**

### How it works

- **Errors:** any Axios error that reaches TanStack Query fires `toast.error()` automatically, using the `title` and `message` from the `ApiResponse` envelope.
- **Successes (mutations only):** when the response is an `ApiResponse`, `toast.success()` fires automatically.
- **Queries** do not show success toasts — only errors.

### `Meta` type

```ts
// src/features/tanstack-query/types/tanstack-query.type.ts
interface Meta extends Record<string, unknown> {
  showToast: boolean;
}
```

`Meta` is registered globally via module augmentation — both `queryMeta` and `mutationMeta` are typed automatically across the codebase.

### Suppressing a toast

Pass `meta: { showToast: false }` on the query or mutation options:

```ts
// Suppress both error and success toasts
useMutation({
  mutationFn: submitDraft,
  meta: { showToast: false },
});

queryOptions({
  queryKey: ["silentCheck"],
  queryFn: fetchSilentCheck,
  meta: { showToast: false },
});
```

### Custom error handling alongside meta

If a query or mutation needs custom behaviour on error (e.g. redirect, field-level feedback), set `showToast: false` and handle it in `onError`:

```ts
useMutation({
  mutationFn: verifyIdentity,
  meta: { showToast: false },
  onError: (error) => {
    if (isAxiosError(error) && error.response?.status === 422) {
      form.setError("rut", { message: "RUT no encontrado" });
    }
  },
});
```

**Rules:**
- Never call `toast.error()` or `toast.success()` directly in a component, hook, or service. The central handler is the single place.
- Never override the central handler's behaviour by catching errors inside a service.
- `showToast: false` is the only escape hatch — use it when the query/mutation handles feedback itself.

---

## Anti-patterns

| Do not | Why |
|---|---|
| Call `axios.get()` directly | Always use `axiosBasic` from `@/features/axios/lib/axios.lib` |
| Add interceptors inside a component or hook | Interceptors belong with the instance configuration |
| Put `try/catch` inside a service | Let errors propagate to the Query layer |
| Import from `services/` inside `lib/` | The dependency direction is `services/ → lib/`, never reversed |
| Import TanStack Query inside a service | Services are pure async functions with no query awareness |
| Unwrap `data.data` inside a service | Return the full `ApiResponse<T>` envelope — callers decide what to use |
