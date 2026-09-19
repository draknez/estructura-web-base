---
name: accessibility-a11y
description: Accesibilidad web real (WCAG 2.2), navegación por teclado, focus rings visibles, contraste cromático y soporte para lectores de pantalla.
---

# Web Accessibility (a11y) Skill

Estándares WCAG 2.2 para interfaces accesibles y usables por todos:

1. **Navegación por Teclado:**
   - Todo botón, link o input debe ser alcanzable mediante `Tab`.
   - Modales deben atrapar el foco (`focus trap`) y cerrarse con la tecla `Escape`.

2. **Indicadores de Foco Visibles:**
   - Jamás remover el foco (`outline-none`) sin reemplazarlo por un focus ring visible y estilizado (`focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2`).

3. **Contraste y Legibilidad:**
   - Ratio mínimo de contraste 4.5:1 para texto normal y 3:1 para texto grande.
   - Textos secundarios no deben ser excesivamente tenues (`text-slate-400` sobre fondos oscuros).

4. **Reducción de Movimiento:**
   - Respetar `prefers-reduced-motion` para usuarios sensibles al movimiento.
