---
name: information-architecture
description: Arquitectura de información, flujos con mínima fricción cognitiva, layouts limpios y reducción de clics en aplicaciones web.
---

# Information Architecture & Cognitive Load Skill

Diseño de flujos intuitivos y estructuración lógica de la aplicación:

1. **Jerarquía Progresiva:**
   - Mostrar solo la información necesaria en el primer nivel de vista ("Progressive Disclosure").
   - Detalles secundarios accesibles mediante drawers, accordions o tooltips.

2. **Cero Estados Vacíos Muertos (Empty States):**
   - Cuando una tabla o lista esté vacía, mostrar una ilustración o ícono amigable, explicación breve y un botón de llamada a la acción (CTA) claro para crear el primer registro.

3. **Feedback de Operación Inmediato:**
   - Cada acción asíncrona (guardar, editar, eliminar) debe mostrar un estado de carga (`loading spinner`), deshabilitar el botón para evitar doble clic, y confirmar con una notificación toast o badge de éxito/error.
