import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de forma inteligente, resolviendo conflictos.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}