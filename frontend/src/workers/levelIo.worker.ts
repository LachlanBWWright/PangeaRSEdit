import { levelIoRequestSchema } from "@/data/level-io/levelIoSchemas";
import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";
import {
  preparePreviewLevelBytes,
  serializeLevelDownloadBytes,
} from "@/data/level-io/serializeLevelBytes";

function postMessageWithTransfers(
  message: unknown,
  transfers: Transferable[] = [],
): void {
  globalThis.postMessage(message, { transfer: transfers });
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsedRequest = levelIoRequestSchema.safeParse(event.data);
  if (!parsedRequest.success) {
    return;
  }

  const request = parsedRequest.data;

  const notifyProgress = (progress: {
    readonly stage:
      | "parse.resource-fork"
      | "parse.validation"
      | "parse.images"
      | "serialize.resource-fork"
      | "serialize.textures"
      | "preview.ready";
    readonly message: string;
    readonly completed?: number;
    readonly total?: number;
  }) => {
    postMessageWithTransfers({
      requestId: request.requestId,
      type: "progress",
      progress,
    });
  };

  void (async () => {
    if (request.type === "parse-level") {
      const parseResult = await parseLevelBytes(
        {
          levelBytes: request.levelBytes,
          globals: request.globals,
          mightyMikeTilesetBytes: request.mightyMikeTilesetBytes,
          mightyMikePaletteBytes: request.mightyMikePaletteBytes,
          mightyMikeSceneName: request.mightyMikeSceneName,
        },
        notifyProgress,
      );
      if (parseResult.isErr()) {
        postMessageWithTransfers({
          requestId: request.requestId,
          type: "failed",
          error: {
            code: parseResult.error.code,
            message: parseResult.error.message,
          },
        });
        return;
      }
      const transfers: Transferable[] = [];
      for (const image of parseResult.value.mapImages) {
        transfers.push(image.rgbaBytes);
      }
      for (const image of parseResult.value.collisionImages) {
        transfers.push(image.rgbaBytes);
      }
      postMessageWithTransfers(
        {
          requestId: request.requestId,
          type: "parsed-level",
          levelData: parseResult.value.levelData,
          mapImages: parseResult.value.mapImages,
          collisionImages: parseResult.value.collisionImages,
        },
        transfers,
      );
      return;
    }

    if (request.type === "serialize-download") {
      const serializeResult = serializeLevelDownloadBytes(
        {
          globals: request.globals,
          fileName: request.fileName,
          mapImagesFileName: request.mapImagesFileName,
          levelData: request.levelData,
          mapImages: request.mapImages,
        },
        notifyProgress,
      );
      if (serializeResult.isErr()) {
        postMessageWithTransfers({
          requestId: request.requestId,
          type: "failed",
          error: {
            code: serializeResult.error.code,
            message: serializeResult.error.message,
          },
        });
        return;
      }
      const transfers: Transferable[] = [];
      for (const file of serializeResult.value) {
        transfers.push(file.bytes.buffer);
      }
      postMessageWithTransfers(
        {
          requestId: request.requestId,
          type: "serialized-download",
          files: serializeResult.value,
        },
        transfers,
      );
      return;
    }

    const previewResult = await preparePreviewLevelBytes(
      {
        globals: request.globals,
        levelData: request.levelData,
        mapImages: request.mapImages,
      },
      notifyProgress,
    );
    if (previewResult.isErr()) {
      postMessageWithTransfers({
        requestId: request.requestId,
        type: "failed",
        error: {
          code: previewResult.error.code,
          message: previewResult.error.message,
        },
      });
      return;
    }

    const transfers: Transferable[] = [];
    if (previewResult.value.dataBytes) {
      transfers.push(previewResult.value.dataBytes.buffer);
    }
    if (previewResult.value.rsrcBytes) {
      transfers.push(previewResult.value.rsrcBytes.buffer);
    }
    if (previewResult.value.textureBytes) {
      transfers.push(previewResult.value.textureBytes.buffer);
    }

    postMessageWithTransfers(
      {
        requestId: request.requestId,
        type: "prepared-preview",
        dataBytes: previewResult.value.dataBytes,
        rsrcBytes: previewResult.value.rsrcBytes,
        textureBytes: previewResult.value.textureBytes,
      },
      transfers,
    );
  })().catch((error: unknown) => {
    postMessageWithTransfers({
      requestId: request.requestId,
      type: "failed",
      error: {
        code: "worker.failed",
        message: error instanceof Error ? error.message : String(error),
      },
    });
  });
};
