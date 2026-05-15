import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { snapshotCanvasImages } from "@/data/level-io/terrainImageSnapshots";
import {
  preparePreviewWithWorker,
  serializeDownloadWithWorker,
} from "@/data/level-io/levelIoWorkerClient";
import type { LevelIoProgress } from "@/data/level-io/levelIoTypes";

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const stableBytes = Uint8Array.from(bytes);
  const blob = new Blob([stableBytes], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function buildPreviewTerrainBlobs(
  data: LevelData,
  globals: GlobalsInterface,
  mapImages: HTMLCanvasElement[] | undefined,
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<{
  dataBytes: Uint8Array | null;
  rsrcBytes: Uint8Array | null;
  textureBytes: Uint8Array | null;
} | null> {
  const snapshotResult = snapshotCanvasImages(mapImages ?? []);
  if (snapshotResult.isErr()) {
    return null;
  }

  const previewResult = await preparePreviewWithWorker(
    {
      globals,
      levelData: data,
      mapImages: snapshotResult.value,
    },
    onProgress,
  );
  if (previewResult.isErr()) {
    return null;
  }

  return {
    dataBytes: previewResult.value.dataBytes,
    rsrcBytes: previewResult.value.rsrcBytes,
    textureBytes: previewResult.value.textureBytes,
  };
}

export async function saveMap({
  mapFile,
  mapImagesFile,
  mapImages,
  data,
  globals,
  mapDownloadName,
  toast,
  onProgress,
}: {
  mapFile: File | undefined;
  mapImagesFile: File | undefined;
  mapImages: HTMLCanvasElement[] | undefined;
  data: LevelData;
  globals: GlobalsInterface;
  mapDownloadName?: string;
  toast: (opts: { title: string; description?: string }) => void;
  onProgress?: (progress: LevelIoProgress) => void;
}) {
  if (!mapFile) {
    toast({
      title: "Download failed",
      description: "Map file is not loaded. Please load a level first.",
    });
    return;
  }

  const snapshotResult = snapshotCanvasImages(mapImages ?? []);
  if (snapshotResult.isErr()) {
    toast({
      title: "Download failed",
      description: snapshotResult.error,
    });
    return;
  }

  const serializeResult = await serializeDownloadWithWorker(
    {
      globals,
      fileName: mapDownloadName ?? mapFile.name,
      mapImagesFileName: mapImagesFile?.name,
      levelData: data,
      mapImages: snapshotResult.value,
    },
    onProgress,
  );
  if (serializeResult.isErr()) {
    toast({
      title: "Download failed",
      description: serializeResult.error.message,
    });
    return;
  }

  for (const file of serializeResult.value.files) {
    downloadBytes(file.bytes, file.filename);
  }

  toast({
    title: "Map Downloaded!",
  });
}
