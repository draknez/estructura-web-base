---
name: top-tier-ui-ux
description: Guía y directrices de diseño UX/UI de primer nivel para aplicaciones web con React, Tailwind CSS, Motion e iconografía moderna.
---

# Top-Tier UI/UX Design System & Animation Guidelines

Esta skill guía la creación de interfaces web modernas, fluidas y de alto impacto estético y funcional.

---

## 1. Principios de Diseño Visual ("Calm & High-Taste UI")

- **Jerarquía Clara:** Usa contrastes marcados de peso tipográfico (`font-semibold`, `font-normal`) y tamaño antes que demasiados colores.
- **Espaciado Intencional:** Manten padding y margins consistentes (escala de 4px/8px: `p-2`, `p-4`, `p-6`, `gap-4`).
- **Capas y Profundidad:**
  - Fondos sutiles con gradientes radiales oscuros o de malla (`bg-gradient-to-tr`).
  - Bordes translúcidos finos: `border border-white/10` o `border-zinc-800`.
  - Efectos de desenfoque de fondo ("glassmorphism"): `backdrop-blur-md bg-zinc-900/70`.
- **Modo Oscuro Predeterminado:** Tonos zinc/slate profundos (`bg-zinc-950`, `text-zinc-100`, `text-zinc-400`), evitando el negro puro `#000000` en áreas grandes.

---

## 2. Motion & Microinteracciones (con `motion/react`)

### A. Reglas de Animación
1. **Duración:** 150ms a 300ms para microinteracciones (botones, dropdowns, tooltips); 300ms a 500ms para modales y navegación.
2. **Curvas Fluidas:** Usar resortes (`type: "spring", stiffness: 300, damping: 25`) o bezier suave (`ease: [0.16, 1, 0.3, 1]`).
3. **Respeto a la Accesibilidad:** Siempre soportar `prefers-reduced-motion`.

### B. Patrones Comunes

#### Botón con respuesta táctil:
```jsx
import { motion } from "motion/react";

export function GlowButton({ children, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className="relative px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
    >
      {children}
    </motion.button>
  );
}
```

#### Entrada de Card / Elemento:
```jsx
import { motion } from "motion/react";

export function AnimatedCard({ children, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
      className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm hover:border-zinc-700 transition-colors"
    >
      {children}
    </motion.div>
  );
}
```

---

## 3. Catálogo de Recursos para Componentes y Efectos
- **Componentes Animados Listos:** [ui.aceternity.com](https://ui.aceternity.com/) y [magicui.design](https://magicui.design/)
- **Micro-interacciones y UI:** [reactbits.dev](https://www.reactbits.dev/) y [uiverse.io](https://uiverse.io/)
- **Iconos:** `lucide-react` (íconos vectoriales coherentes, stroke 1.5 a 2px)
