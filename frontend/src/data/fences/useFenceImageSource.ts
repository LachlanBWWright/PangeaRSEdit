import { useEffect, useReducer } from "react";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { errorSchema } from "@/schemas/common";

const dataUrlCache = new Map<string, string>();
const inflightLoads = new Map<string, Promise<string | null>>();

function isRenderableImagePath(src: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|svg|tga)$/i.test(src);
}

async function loadTgaDataUrlAsync(src: string): Promise<string | null> {
  return fetch(src)
    .then(async (response) => {
      if (!response.ok) {
        console.warn(
          `Failed to fetch TGA thumbnail ${src}: ${response.statusText}`,
        );
        return null;
      }
      const buffer = await response.arrayBuffer();
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
      const parseResult = errorSchema.safeParse(error);
      console.warn(
        `Failed to load TGA thumbnail ${src}:`,
        parseResult.success ? parseResult.data.message : String(error),
      );
      return null;
    });
}

async function loadTgaAsDataUrl(src: string): Promise<string | null> {
  const cached = dataUrlCache.get(src);
  if (cached) return cached;

  const inflight = inflightLoads.get(src);
  if (inflight) return inflight;

  const promise = loadTgaDataUrlAsync(src).finally(() => {
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
      if (cancelled) return;
      dispatch({ src: dataUrl });
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}
