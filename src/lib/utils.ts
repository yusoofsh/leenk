import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and merges Tailwind CSS classes using twMerge.
 * This utility resolves class name conflicts intelligently, ensuring that later classes
 * override earlier ones when they target the same CSS property.
 *
 * @param inputs - Variable number of class name values (strings, arrays, objects, etc.)
 * @returns A single merged class name string with resolved Tailwind conflicts
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', condition && 'text-blue-500') // Conditionally applies classes
 * cn({ 'bg-white': true, 'bg-black': false }) // Returns: 'bg-white'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
