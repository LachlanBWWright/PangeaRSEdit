import { useEffect, useReducer } from "react";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";

const dataUrlCache = new Map<string, string>();
const inflightLoads = new Map<string, Promise<string | null>>();

function isRenderableImagePath(src: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|svg|tga)$/i.test(src);
}

async function loadTgaAsDataUrl(src: string): Promise<string | null> {
  const cached = dataUrlCache.get(src);
  if (cached) return cached;

  const inflight = inflightLoads.get(src);
  if (inflight) return inflight;

  const promise = fetch(src)
    .then((response) => {
      if (!response.ok) {
        console.warn(
          `Failed to fetch TGA thumbnail ${src}: ${response.statusText}`,
        );
        return null;
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      if (!buffer) return null;
      const canvasResult = parseTGAToCanvas(buffer);
      if (canvasResult.isErr()) {
        console.warn(
          `Failed to parse TGA thumbnail ${src}: ${canvasResult.error.message}`,
        );
        return null;
      }
      const dataUrl = canvasResult.value.toDataURL("image/png");
      dataUrlCache.set(src, dataUrl);
      return dataUrl;
    })
    .catch((error: unknown) => {
      console.warn(
        `Failed to load TGA thumbnail ${src}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    })
    .finally(() => {
      inflightLoads.delete(src);
    });

  inflightLoads.set(src, promise);
  return promise;
}

interface FenceImageAction {
  src: string | null;
}

export function useFenceImageSource(src: string | null): string | null {
  const [resolvedSrc, dispatch] = useReducer(
    (_state: string | null, action: FenceImageAction) => action.src,
    null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!src || !isRenderableImagePath(src)) {
      dispatch({ src: null });
      return;
    }

    if (!src.toLowerCase().endsWith(".tga")) {
      dispatch({ src });
      return;
    }

    const cached = dataUrlCache.get(src);
    if (cached) {
      dispatch({ src: cached });
      return;
    }

    dispatch({ src: null });
    void loadTgaAsDataUrl(src).then((dataUrl) => {
      if (!cancelled) {
        dispatch({ src: dataUrl });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}
