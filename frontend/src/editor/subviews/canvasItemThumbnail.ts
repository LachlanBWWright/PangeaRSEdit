import { useEffect, useMemo, useState } from "react";
import {
  findBestItemScreenshot,
  getItemScreenshotManifest,
  type ItemScreenshotKind,
  type ItemScreenshotManifestEntry,
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

function getFallbackThumbnailKind(
  kind: ItemScreenshotKind,
): ItemScreenshotKind {
  return kind === "terrainItem" ? "splineItem" : "terrainItem";
}

function findCanvasItemScreenshot(
  manifest: readonly ItemScreenshotManifestEntry[],
  options: ItemThumbnailImageOptions,
): ReturnType<typeof findBestItemScreenshot> {
  const params = {
    p0: options.params?.p0,
    p1: options.params?.p1,
    p2: options.params?.p2,
    p3: options.params?.p3,
    flags: options.params?.flags,
  };
  const screenshot = findBestItemScreenshot(manifest, {
    game: options.game,
    kind: options.kind,
    itemType: options.itemType,
    levelNum: options.levelNum,
    params,
  });
  if (screenshot) return screenshot;

  return findBestItemScreenshot(manifest, {
    game: options.game,
    kind: getFallbackThumbnailKind(options.kind),
    itemType: options.itemType,
    levelNum: options.levelNum,
    params,
  });
}

export interface CanvasItemThumbnail {
  readonly image: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

const thumbnailCache = new Map<string, HTMLCanvasElement>();
const BACKGROUND_COLOR_DISTANCE = 24;

function colorDistance(
  data: Uint8ClampedArray,
  index: number,
  red: number,
  green: number,
  blue: number,
): number {
  const redDelta = (data[index] ?? 0) - red;
  const greenDelta = (data[index + 1] ?? 0) - green;
  const blueDelta = (data[index + 2] ?? 0) - blue;
  return Math.sqrt(redDelta ** 2 + greenDelta ** 2 + blueDelta ** 2);
}

function createTransparentThumbnail(
  image: HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
): HTMLCanvasElement | null {
  const cropX = sourceWidth * 0.25;
  const cropY = sourceHeight * 0.1;
  const cropWidth = sourceWidth * 0.5;
  const cropHeight = sourceHeight * 0.8;
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );
  const imageData = context.getImageData(0, 0, cropWidth, cropHeight);
  const backgroundRed = imageData.data[0] ?? 0;
  const backgroundGreen = imageData.data[1] ?? 0;
  const backgroundBlue = imageData.data[2] ?? 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    if (
      colorDistance(
        imageData.data,
        index,
        backgroundRed,
        backgroundGreen,
        backgroundBlue,
      ) <= BACKGROUND_COLOR_DISTANCE
    ) {
      imageData.data[index + 3] = 0;
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
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
          findCanvasItemScreenshot(manifest, {
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
    readonly image: HTMLCanvasElement;
  } | null>(null);

  useEffect(() => {
    if (!screenshot) return;

    const nextImage = new Image();
    nextImage.onload = () => {
      const cachedThumbnail = thumbnailCache.get(screenshot.imageUrl);
      const transparentThumbnail =
        cachedThumbnail ??
        createTransparentThumbnail(nextImage, screenshot.width, screenshot.height);
      if (!transparentThumbnail) {
        setLoadedImage(null);
        return;
      }
      thumbnailCache.set(screenshot.imageUrl, transparentThumbnail);
      setLoadedImage({ url: screenshot.imageUrl, image: transparentThumbnail });
    };
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
    width: loadedImage.image.width,
    height: loadedImage.image.height,
  };
}
