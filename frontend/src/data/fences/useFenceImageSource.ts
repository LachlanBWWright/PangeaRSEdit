import { useEffect, useState } from "react";
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

  const promise = (async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        console.warn(`Failed to fetch TGA thumbnail ${src}: ${response.statusText}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const canvasResult = parseTGAToCanvas(buffer);
      if (canvasResult.isErr()) {
        console.warn(`Failed to parse TGA thumbnail ${src}: ${canvasResult.error.message}`);
        return null;
      }

      const dataUrl = canvasResult.value.toDataURL("image/png");
      dataUrlCache.set(src, dataUrl);
      return dataUrl;
    } catch (error) {
      console.warn(
        `Failed to load TGA thumbnail ${src}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    } finally {
      inflightLoads.delete(src);
    }
  })();

  inflightLoads.set(src, promise);
  return promise;
}

export function useFenceImageSource(src: string | null): string | null {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!isRenderableImagePath(src)) {
      setResolvedSrc(null);
      return;
    }

    if (!src.toLowerCase().endsWith(".tga")) {
      setResolvedSrc(src);
      return;
    }

    const cached = dataUrlCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    setResolvedSrc(null);
    void loadTgaAsDataUrl(src).then((dataUrl) => {
      if (!cancelled) {
        setResolvedSrc(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}
