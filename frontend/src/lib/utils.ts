import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class values into a single deduplicated class string. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
