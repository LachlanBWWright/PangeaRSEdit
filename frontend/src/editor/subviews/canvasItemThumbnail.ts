import { useEffect, useMemo, useState } from "react";
import {
  findBestItemScreenshot,
  getItemScreenshotManifest,
  type ItemScreenshotKind,
  type ParamSlot,
} from "@/data/items/itemScreenshotManifest";
import type { Game } from "@/data/globals/globals";

interface ItemThumbnailImageOptions {
  readonly game: Game;
  readonly kind: ItemScreenshotKind;
  readonly itemType: number;
  readonly levelNum?: number;
  readonly params?: Partial<Record<ParamSlot, number>>;
}

export interface CanvasItemThumbnail {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

export function useCanvasItemThumbnail({
  game,
  kind,
  itemType,
  levelNum,
  params,
}: ItemThumbnailImageOptions): CanvasItemThumbnail | null {
  const p0 = params?.p0;
  const p1 = params?.p1;
  const p2 = params?.p2;
  const p3 = params?.p3;
  const flags = params?.flags;
  const screenshot = useMemo(
    () =>
      getItemScreenshotManifest()
        .map((manifest) =>
          findBestItemScreenshot(manifest, {
            game,
            kind,
            itemType,
            levelNum,
            params: { p0, p1, p2, p3, flags },
          }),
        )
        .unwrapOr(null),
    [
      game,
      kind,
      itemType,
      levelNum,
      p0,
      p1,
      p2,
      p3,
      flags,
    ],
  );
  const [loadedImage, setLoadedImage] = useState<{
    readonly url: string;
    readonly image: HTMLImageElement;
  } | null>(null);

  useEffect(() => {
    if (!screenshot) return;

    const nextImage = new Image();
    nextImage.onload = () =>
      setLoadedImage({ url: screenshot.imageUrl, image: nextImage });
    nextImage.onerror = () => setLoadedImage(null);
    nextImage.src = screenshot.imageUrl;

    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [screenshot]);

  if (!screenshot || !loadedImage || loadedImage.url !== screenshot.imageUrl) {
    return null;
  }
  return {
    image: loadedImage.image,
    width: screenshot.width,
    height: screenshot.height,
  };
}
