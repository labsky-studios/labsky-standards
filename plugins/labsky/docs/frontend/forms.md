# Forms

> Read when: building or modifying any form, connecting validation to inputs, handling server errors in forms, or using input masking.

---

## Stack

| Concern | Tool |
|---|---|
| Form state | React Hook Form |
| Validation | Valibot via `valibotResolver` from `@hookform/resolvers/valibot` |
| Input masking | Maskito via `<MaskedInput>` |
| UI inputs | shadcn/ui components via `<FormField>` |

---

## File structure

Each form lives inside its feature. Split across three files when the submit logic is non-trivial:

```
src/features/[feature]/
  components/
    [name]-form.component.tsx       → renders the form UI
  hooks/
    use-[name]-form.hook.ts         → form instance, submit handler (extract only when reused or complex)
  schemas/
    [name]-form.schema.ts           → Valibot schema + inferred type
```

For simple forms the hook can be inlined in the component.

---

## Schema — define first

Define the Valibot schema before writing the form component. The TypeScript type is always derived from the schema — never written manually.

```ts
// schemas/contact-form.schema.ts
import * as v from "valibot";

export const contactFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
  email: v.pipe(v.string(), v.email({ message: "Ingresa un correo válido" })),
  phone: v.pipe(v.string(), v.minLength(8, { message: "Teléfono inválido" })),
});

export type ContactFormData = v.InferOutput<typeof contactFormSchema>;
```

Validation error messages are user-facing prose — see `docs/frontend/data-and-validation.md`.

---

## Component

Every form uses the shadcn `<Form />` wrapper. Never render a bare `<form>` tag without it.
Never use `register` or `Controller` directly — always use `<FormField>`, which wraps `Controller` and wires accessibility and errors automatically.

```tsx
// components/contact-form.component.tsx
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SubmitButton,
} from "@/components/ui/form";
import { contactFormSchema, type ContactFormData } from "@/features/[feature]/schemas/contact-form.schema";

function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: valibotResolver(contactFormSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  async function onSubmit(data: ContactFormData) {
    // call service / mutation
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ingresa tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton>Enviar</SubmitButton>
      </form>
    </Form>
  );
}

export { ContactForm };
```

**Rules:**
- `<Form {...form}>` is the outermost wrapper — it provides the form context.
- `<form noValidate>` is the inner HTML form.
- Every field follows the same structure: `<FormField>` → `<FormItem>` → `<FormLabel>` → `<FormControl>` → input → `<FormMessage />`.
- `<FormMessage />` renders the Valibot or server error for that field automatically.
- `<SubmitButton>` from `@/components/ui/form` handles the pending state — do not use a plain `<button type="submit">`.

---

## Input masking with Maskito

Use `<MaskedInput>` for any field that requires character-level masking. It accepts all `Input` props plus an `options` prop.

```tsx
import { MaskedInput } from "@/features/maskito/components/masked-input.component";
import { justWordsMaskOptions } from "@/features/maskito/utils/maskito.util";

<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel isRequired>Nombres</FormLabel>
      <FormControl>
        <MaskedInput
          options={justWordsMaskOptions}
          placeholder="Ingresa tus nombres"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Mask option objects live in `src/features/maskito/utils/maskito.util.ts` — never inline mask definitions in a component.

For phone numbers use `<PhoneInput>` from `@/components/ui/phone-input.component` — it encapsulates the +503 prefix and its own mask.

---

## Server errors

Server-side validation errors surface inline, below the relevant field — not in a toast. Wire them via `form.setError()` in the mutation's `onError`:

```ts
onError: (error) => {
  form.setError("email", { message: "Este correo ya está registrado" });
}
```

For non-field server errors (rate limit, service unavailable), use a toast — not a field error.

---

## Anti-patterns

| Do not | Why |
|---|---|
| Use `register` directly | Use `<FormField>` — it wires accessibility and errors automatically |
| Use `Controller` directly | `<FormField>` is the project-standard wrapper around `Controller` |
| Render a bare `<form>` without `<Form />` | `<Form />` is required for all forms — no exceptions |
| Use a plain `<button type="submit">` | Use `<SubmitButton>` — it handles the pending state |
| Define mask options inline in a component | Mask options live in `src/features/maskito/utils/maskito.util.ts` |
| Use `useState` to track field values | RHF owns form state — `useState` creates a second source of truth |
| Use `useEffect` to sync form values to external state | Use `watch()` or `useWatch()` if external sync is needed |
| Show server field errors in a toast | Field errors belong inline below the field via `form.setError()` |
| Define the Valibot schema inline in the component | Schema lives in `schemas/[name]-form.schema.ts` |
