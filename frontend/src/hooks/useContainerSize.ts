import { useEffect, useRef, useState } from "react";

interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Tracks the pixel dimensions of a DOM element, updating on resize.
 * Uses ResizeObserver when available, otherwise falls back to window resize events.
 */
export function useContainerSize(
  defaultWidth = 3000,
  defaultHeight = 2000,
): [React.RefObject<HTMLDivElement | null>, ContainerSize] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: defaultWidth,
    height: defaultHeight,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const obs = new ResizeObserver(updateSize);
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return [containerRef, containerSize];
}
