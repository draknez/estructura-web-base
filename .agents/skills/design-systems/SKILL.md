---
name: design-systems
description: Arquitectura de componentes reutilizables, design tokens semánticos (colores, espaciados, tipografía) y consistencia visual con Tailwind v4 y CVA.
---

# Design Systems & Tokens Skill

Estructuración de componentes escalables y tokens de diseño:

1. **Tokens Semánticos:**
   - No hardcodear colores hexadecimales en los componentes.
   - Usar variables CSS semánticas en `:root` y clases como `bg-slate-900`, `text-slate-100`, `border-zinc-800`.
   
2. **Composición con CVA y CN:**
   - Usar `class-variance-authority` (CVA) y `src/utils/cn.js` (`clsx` + `tailwind-merge`) para variantes limpias (`primary`, `secondary`, `destructive`, `ghost`).

3. **Consistencia de Escala:**
   - Radio de bordes consistente: `rounded-xl` o `rounded-2xl` para cards y modales, `rounded-lg` para botones e inputs.
   - Ritmo vertical y horizontal con padding predecible (`p-3`, `p-4`, `p-6`).
