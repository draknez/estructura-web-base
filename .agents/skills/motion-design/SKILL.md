---
name: motion-design
description: Creación de microinteracciones fluidas, transiciones de vista y física con Motion (Framer Motion) y tailwindcss-motion.
---

# Motion & Interaction Design Skill

Guía para implementar animaciones y transiciones de nivel profesional:

1. **Microinteracciones táctiles:**
   - Todo elemento accionable (botones, links, tarjetas interactivas) debe tener respuesta táctil (`whileHover`, `whileTap` o clases como `motion-scale-in-75 motion-duration-200`).
   - Evitar animaciones lineales aburridas; usar siempre `spring` o `ease-out`.

2. **Transiciones de Página & Estado:**
   - Usar `AnimatePresence` de `motion/react` para animar entradas y salidas de modales, alertas y rutas.
   - Salidas más rápidas que las entradas (ejemplo: entrada 300ms, salida 180ms).

3. **Herramientas disponibles en el repo:**
   - Librería: `motion` (`motion/react`)
   - Utility plugin: `tailwindcss-motion` (ej: `motion-preset-fade`, `motion-preset-slide-up`, `motion-preset-bounce`)
