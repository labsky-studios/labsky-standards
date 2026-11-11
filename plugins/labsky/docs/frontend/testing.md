# Testing

> Read when: writing, modifying, or reviewing any test file.

---

## File location and naming

Test files live inside the feature, in a `tests/` subfolder beside the code they cover. Never co-locate test files with source files at the same level.

```
src/features/contacts/
  components/
    contact-card.component.tsx
  hooks/
    use-contacts.hook.ts
  services/
    contacts.service.ts
  tests/
    contact-card.component.test.tsx
    use-contacts.hook.test.ts
    contacts.service.test.ts
```

File naming pattern: `[name].[type].test.ts` / `[name].[type].test.tsx`

---

## What to test and how

| Layer | Test type | What to cover |
|---|---|---|
| `hooks/` | Unit | Logic and state in isolation — mock dependencies |
| `services/` | Unit | HTTP calls — mock with msw |
| `components/` | Integration + a11y | Rendered output, user interaction, accessibility |
| `queries/` | Integration | Query options shape — use a mocked query client |
| `schemas/` | Unit | Valid and invalid inputs — test the schema directly, not via the form |
| `stores/` | Unit | State transitions — test actions and their side effects |

---

## Test structure conventions

```ts
// Describe block = component or function name, exactly as exported
describe("UserProfileCard", () => {
  it("calls onSelect with the userId when clicked", () => { ... });
  it("renders a skeleton when isLoading is true", () => { ... });
  it("renders the error fallback when the query fails", () => { ... });
});
```

- Use `describe` to group tests for a single unit. One `describe` per file.
- Test names follow the pattern: `[does what] [when/given what condition]`.
- Test behaviour, not implementation. If a test breaks when you rename an internal variable without changing behaviour, the test is wrong.

---

## Coverage requirements

| Layer | Minimum coverage |
|---|---|
| `services/` | 90% |
| `schemas/` | 100% |
| `hooks/` with business logic | 80% |
| `components/` | 70% |

Coverage thresholds are enforced in CI. A PR that drops below threshold is blocked from merging.

---

## Determinism

Tests must be fully deterministic:

- Never use `Math.random()` — generate fixed test data.
- Never use `Date.now()` or `new Date()` — mock with `vi.useFakeTimers()` or a fixed timestamp.
- Never depend on test execution order — each test must set up and tear down its own state.
- Never share mutable state between tests — use `beforeEach` to reset.

---

## Mocking

Mock all external dependencies (APIs, third-party libraries, browser APIs):

```ts
// Mocking an API call with msw
import { http, HttpResponse } from "msw";
import { server } from "@/tests/setup/server";

it("returns vehicle data on success", async () => {
  server.use(
    http.get("/vehiculos", () =>
      HttpResponse.json({ id: "1", plate: "ABC123" })
    )
  );
  const result = await getVehicle({ plate: "ABC123" });
  expect(result.plate).toBe("ABC123");
});
```

- Use `msw` for HTTP mocking — never mock `axios` directly.
- Spy on functions with `vi.spyOn()` — never replace module exports manually.
- Mock timers with `vi.useFakeTimers()` — reset in `afterEach`.

---

## Component testing

Use `@testing-library/react`. Test what the user sees and does — not internal state or implementation details.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("calls onSelect with the userId when clicked", async () => {
  const onSelect = vi.fn();
  render(<UserProfileCard userId="u1" onSelect={onSelect} />);

  await userEvent.click(screen.getByRole("button", { name: /select/i }));

  expect(onSelect).toHaveBeenCalledWith("u1");
});
```

**Rules:**
- Query by role, label, or text — not by test ID or class names.
- Use `userEvent` over `fireEvent` for interactions — it simulates real browser behaviour.
- Wrap async interactions in `await` — never use `act()` manually.
- Test loading, empty, and error states — not just the happy path.

---

## Accessibility testing

Every component test must include at least one accessibility check:

```ts
import { axe } from "jest-axe";

it("has no accessibility violations", async () => {
  const { container } = render(<ContactCard contact={mockContact} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Axe checks run in CI. A component with accessibility violations blocks the pipeline.

---

## Test setup

### Vitest configuration

Test setup lives at `src/tests/setup/vitest.setup.ts`. It is referenced in `vite.config.ts` via `test.setupFiles`. Do not create a second setup file — extend the existing one.

```ts
// src/tests/setup/vitest.setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

### msw server

The msw server is configured at `src/tests/setup/server.ts`. Import from this file in tests — do not create a new server instance per test file.

```ts
// src/tests/setup/server.ts
import { setupServer } from "msw/node";

export const server = setupServer();
```

The server starts before all tests and resets handlers after each one. This is configured in `vitest.setup.ts` — do not replicate it in individual test files:

```ts
// vitest.setup.ts
import { server } from "@/tests/setup/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` ensures any unmocked request fails loudly — preventing tests from accidentally hitting real endpoints.

### Shared test utilities

Shared factories, render wrappers, and helpers live in `src/tests/utils/`. Import from there instead of duplicating setup across test files.

```ts
// src/tests/utils/render.tsx — custom render with providers
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};
```

Always use `renderWithProviders` for components that use TanStack Query — never `render` directly.
