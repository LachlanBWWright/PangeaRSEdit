import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { snapshotCanvasImages } from "@/data/level-io/terrainImageSnapshots";
import {
  preparePreviewWithWorker,
  serializeDownloadWithWorker,
} from "@/data/level-io/levelIoWorkerClient";
import type { LevelIoProgress } from "@/data/level-io/levelIoTypes";
import { getFeatureFlags } from "@/config/featureFlags";
import {
  cacheDownloadArtifacts,
  cachePreviewArtifacts,
  getCachedDownloadFiles,
  getCachedPreviewArtifacts,
  getLevelOutputCacheKeys,
  getLevelOutputReuse,
} from "@/data/level-io/levelOutputCache";

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

  if (getFeatureFlags().levelOutputCache) {
    const keys = getLevelOutputCacheKeys(
      data,
      globals,
      snapshotResult.value,
    );
    const reuse = getLevelOutputReuse(globals, keys);
    const cached = getCachedPreviewArtifacts(
      globals,
      reuse,
      snapshotResult.value.length > 0,
    );
    if (cached) return cached;

    const previewResult = await preparePreviewWithWorker(
      {
        globals,
        levelData: data,
        mapImages: snapshotResult.value,
        ...reuse,
      },
      onProgress,
    );
    if (previewResult.isErr()) return null;
    cachePreviewArtifacts(globals, keys, previewResult.value);
    return {
      dataBytes: previewResult.value.dataBytes
        ? Uint8Array.from(previewResult.value.dataBytes)
        : null,
      rsrcBytes: previewResult.value.rsrcBytes
        ? Uint8Array.from(previewResult.value.rsrcBytes)
        : null,
      textureBytes: previewResult.value.textureBytes
        ? Uint8Array.from(previewResult.value.textureBytes)
        : null,
    };
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

  const useCache = getFeatureFlags().levelOutputCache;
  const cacheKeys = useCache
    ? getLevelOutputCacheKeys(data, globals, snapshotResult.value)
    : null;
  const reuse = cacheKeys ? getLevelOutputReuse(globals, cacheKeys) : {};
  if (cacheKeys) {
    const cachedFiles = getCachedDownloadFiles(
      globals,
      reuse,
      mapDownloadName ?? mapFile.name,
      mapImagesFile?.name,
      snapshotResult.value.length > 0,
    );
    if (cachedFiles) {
      for (const file of cachedFiles) downloadBytes(file.bytes, file.filename);
      toast({ title: "Map Downloaded!" });
      return;
    }
  }
  const serializeResult = await serializeDownloadWithWorker(
    {
      globals,
      fileName: mapDownloadName ?? mapFile.name,
      mapImagesFileName: mapImagesFile?.name,
      levelData: data,
      mapImages: snapshotResult.value,
      ...reuse,
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

  if (cacheKeys) {
    cacheDownloadArtifacts(globals, cacheKeys, serializeResult.value.files);
  }

  toast({
    title: "Map Downloaded!",
  });
}
