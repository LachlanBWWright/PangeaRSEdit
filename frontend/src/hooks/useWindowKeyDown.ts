import { useEffect } from "react";

/**
 * Registers a keydown event listener on window for the lifetime of the component.
 * The handler is re-registered whenever it changes.
 */
export function useWindowKeyDown(
  handler: (event: KeyboardEvent) => void,
): void {
  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
