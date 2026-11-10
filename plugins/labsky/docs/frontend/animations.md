# Animations

> Read when: adding transitions, sequenced animations, scroll-driven effects, or mount/unmount presence animations.

---

## Tool selection

| Use case | Tool |
|---|---|
| Simple transitions — opacity, scale, position | Motion |
| Mount / unmount presence animations | Motion (`AnimatePresence`) |
| Layout animations between components | Motion (`layout` prop) |
| Shared layout transitions between routes | Motion |
| Complex sequenced animations with a timeline | GSAP |
| Scroll-driven effects | GSAP (ScrollTrigger) |
| SVG path animation, morphing, stagger sequences | GSAP |
| Counter or number animations | GSAP |

When in doubt, start with Motion. Reach for GSAP only when Motion cannot express the sequence or when timeline control is required.

---

## Motion

### Define variants outside the component

Objects created inline in JSX are new references on every render. Variants defined outside are stable.

```tsx
// Wrong — new object every render
<motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 10 }} />

// Correct
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

<motion.div variants={fadeUp} initial="hidden" animate="visible" />
```

### Motion presets

Reusable Motion configurations live in `src/features/motion/presets/motion.preset.ts` as the `motionPresets` object. Import from there instead of re-declaring the same variant shapes inline.

| Preset | Purpose | Key option(s) |
|---|---|---|
| `staggerContainer` | Wrapper that staggers its children in/out using `whileInView` | `staggerDelay`, `startDelay` |
| `staggerItem` | Individual child inside a stagger container | `distance` (y offset), `transition` |
| `slide` | Directional slide for wizard/step transitions — driven by a `custom` prop | `SlideDirection` (`"forward"` \| `"backward"`) |

```tsx
import { motionPresets } from "@/features/motion/presets/motion.preset";
import { motion } from "motion/react";

// Stagger a list into view
<motion.ul {...motionPresets.staggerContainer({ staggerDelay: 0.08 })}>
  {items.map(item => (
    <motion.li key={item.id} {...motionPresets.staggerItem({ distance: 12 })}>
      {item.label}
    </motion.li>
  ))}
</motion.ul>

// Directional slide between steps
<motion.div
  {...motionPresets.slide()}
  custom={slideDirection}
>
  <StepContent />
</motion.div>
```

**Rules:**
- When a new animation pattern is used in more than one place, add it to `motionPresets` — do not duplicate variant objects across components.
- Presets return plain `MotionProps` objects — spread them onto any `motion.*` element.
- The `slide` preset requires a `custom` prop set to a `SlideDirection` value; the parent controls direction.
- All presets are factory functions — call them at the use site (not at module level) so options remain explicit at the call site.

---

### AnimatePresence — mount / unmount

Wrap conditionally rendered elements in `<AnimatePresence>` to animate their exit.

```tsx
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="panel"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit="hidden"
    />
  )}
</AnimatePresence>
```

- Always provide a stable `key` to the direct child of `AnimatePresence`.
- Use `mode="wait"` when the exiting element must finish before the entering one starts.

### Layout animations

Use the `layout` prop to animate layout changes — do not manually animate `width`, `height`, or position properties.

```tsx
// Correct — Motion handles the interpolation
<motion.div layout className="flex gap-2">
  {items.map(item => <motion.div key={item.id} layout>{item.label}</motion.div>)}
</motion.div>
```

### Reduced motion

Always respect `prefers-reduced-motion`. Use Motion's built-in hook:

```tsx
import { useReducedMotion } from "motion/react";

const prefersReduced = useReducedMotion();

const variants = {
  hidden: { opacity: 0, y: prefersReduced ? 0 : 10 },
  visible: { opacity: 1, y: 0 },
};
```

---

## GSAP

### Always use `useGSAP`

Never use `useEffect` to run GSAP animations. `useGSAP` from `@gsap/react` handles context creation and cleanup correctly.

```tsx
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";

// Wrong
useEffect(() => { gsap.to(".box", { x: 100 }); }, []);

// Correct
const containerRef = useRef<HTMLDivElement>(null);

useGSAP(() => {
  gsap.to(boxRef.current, { x: 100 });
}, { scope: containerRef });
```

### Scope is required

Always pass a `scope` ref so GSAP selectors are scoped to the component. Without scope, class-based selectors match globally and produce unpredictable behaviour.

### Prefer refs over selectors

Target elements with refs, not class or ID selectors.

```tsx
// Prefer
gsap.to(boxRef.current, { x: 100 });

// Avoid
gsap.to(".box", { x: 100 });
```

### Animate transform, not layout properties

Animating `width`, `height`, `top`, `left`, or `margin` triggers layout recalculation every frame. Always animate `transform` and `opacity` — they are GPU-composited.

```tsx
// Wrong — causes layout thrash every frame
gsap.to(el, { width: 200, top: 50 });

// Correct — GPU composited
gsap.to(el, { x: 50, scaleX: 1.5 });
```

### Registering plugins

Register GSAP plugins once at the application entry point — not inside components.

```ts
// src/main.tsx
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
```

### Cleanup

`useGSAP` handles cleanup automatically when used with a scope. Do not manually call `.kill()` or return cleanup functions from `useGSAP` unless you have a specific, documented reason.

---

## Performance rules — both tools

- Animate `transform` and `opacity` only. Everything else causes layout recalculation.
- Never trigger animations on scroll without `will-change: transform` on the target element — and remove it after the animation completes.
- Do not animate more than ~30 elements simultaneously without profiling first.
- Test animations on a throttled CPU profile in DevTools before shipping.
