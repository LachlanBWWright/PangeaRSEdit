import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface MapPoint {
  readonly x: number;
  readonly y: number;
}

function sendMouseEvent(
  surface: Element,
  type: "mousedown" | "mousemove" | "mouseup",
  point: MapPoint,
  pressed: boolean,
) {
  const bounds = surface.getBoundingClientRect();
  surface.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: bounds.left + point.x,
    clientY: bounds.top + point.y,
    button: 0,
    buttons: pressed ? 1 : 0,
  }));
}

function movePoint(point: MapPoint, key: string, step: number, width: number, height: number) {
  const x = point.x + (key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0);
  const y = point.y + (key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0);
  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

interface KeyboardCanvasProps {
  readonly label: string;
  readonly surfaceSelector: string;
  readonly getInitialPoint?: () => MapPoint | undefined;
  readonly children: ReactNode;
}

export function KeyboardCanvas({ label, surfaceSelector, getInitialPoint, children }: KeyboardCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instructionsId = useId();
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [pressed, setPressed] = useState(false);
  const pointer = useRef<{ point: MapPoint; pressed: boolean } | null>(null);
  const releaseFrame = useRef<number | null>(null);

  function releasePointer() {
    if (releaseFrame.current !== null) {
      window.cancelAnimationFrame(releaseFrame.current);
      releaseFrame.current = null;
    }
    const surface = wrapperRef.current?.querySelector(surfaceSelector);
    const current = pointer.current;
    if (!surface || !current?.pressed) return;
    pointer.current = { ...current, pressed: false };
    setPressed(false);
    sendMouseEvent(surface, "mouseup", current.point, false);
  }

  function initializePointer() {
    if (pointer.current) return;
    const surface = wrapperRef.current?.querySelector(surfaceSelector);
    if (!surface) return;
    const { width, height } = surface.getBoundingClientRect();
    const center = movePoint(
      getInitialPoint?.() ?? { x: Math.floor(width / 2), y: Math.floor(height / 2) },
      "",
      0,
      width,
      height,
    );
    pointer.current = { point: center, pressed: false };
    setPoint(center);
  }

  function resetPointer() {
    releasePointer();
    pointer.current = null;
    setPoint(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
    const surface = wrapperRef.current?.querySelector(surfaceSelector);
    if (!surface) return;
    const { width, height } = surface.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const key = event.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Escape"].includes(key)) return;
    if (key === "Escape" && !pointer.current?.pressed) return;
    event.preventDefault();
    event.stopPropagation();

    const current = pointer.current ?? {
      point: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
      pressed: false,
    };
    const nextPoint = movePoint(current.point, key, event.shiftKey ? 16 : 1, width, height);
    setPoint(nextPoint);
    pointer.current = { ...current, point: nextPoint };

    if (key.startsWith("Arrow")) {
      sendMouseEvent(surface, "mousemove", nextPoint, current.pressed);
      return;
    }
    if (event.repeat) return;
    if (current.pressed) {
      releasePointer();
      return;
    }
    pointer.current = { point: nextPoint, pressed: true };
    sendMouseEvent(surface, "mousedown", nextPoint, true);
    if (key === "Enter") {
      // Brush handlers need to render the initial stroke before mouseup commits it.
      releaseFrame.current = window.requestAnimationFrame(releasePointer);
    } else {
      setPressed(true);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="group relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      role="application"
      aria-label={label}
      aria-describedby={instructionsId}
      tabIndex={0}
      onFocus={initializePointer}
      onKeyDown={handleKeyDown}
      onBlur={resetPointer}
      onPointerDownCapture={resetPointer}
    >
      {children}
      <p id={instructionsId} className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 group-focus-visible:opacity-100">
        Arrow keys move the cursor. Shift moves farther. Enter clicks. Space starts or ends a stroke or drag.
      </p>
      <span role="status" className="sr-only">{pressed ? "Pointer held" : "Pointer released"}</span>
      {point && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-10 hidden size-4 -translate-1/2 rounded-full border-2 border-white bg-slate-950/50 ring-1 ring-black group-focus-visible:block"
          style={{ left: point.x, top: point.y }}
        />
      )}
    </div>
  );
}
