import { bg3dParsedToBG3D, parseBG3D, type BG3DParseResult } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { parse3DMF } from "./parse3dmf";
import { WebIO } from "@gltf-transform/core";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { Result } from "neverthrow";
import { arrayBufferSchema } from "../schemas/common";
import {
  normalizeGltfAsset,
  type GltfCompatibilityWarning,
} from "./gltfCompatibility";

function toExactArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  const parseResult = arrayBufferSchema.safeParse(data);
  if (parseResult.success) {
    return parseResult.data;
  }
  // At this point, data must be Uint8Array (the other type in the union)
  // We need to handle it as such without casting
  const buffer = data instanceof ArrayBuffer ? data : data.buffer;
  const byteOffset = data instanceof ArrayBuffer ? 0 : data.byteOffset;
  const byteLength =
    data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
  const copy = new ArrayBuffer(byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer, byteOffset, byteLength));
  return copy;
}

// Helper function to detect file format and parse accordingly
function parseModelBuffer(
  buffer: ArrayBuffer,
): Result<BG3DParseResult, string> {
  // Check magic number to detect format
  const view = new DataView(buffer);
  if (buffer.byteLength >= 4) {
    const magic = view.getUint32(0, false); // Big-endian
    // 3DMF magic: '3DMF' = 0x33444d46
    if (magic === 0x33444d46) {
      return parse3DMF(buffer);
    }
  }
  // Default to BG3D format
  return parseBG3D(buffer);
}

// Message types
export type BG3DGltfWorkerMessage =
  | {
      type: "bg3d-to-glb";
      buffer: ArrayBuffer;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d";
      buffer: ArrayBuffer;
      fileName?: string;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      buffer: ArrayBuffer;
      fileName?: string;
      requestId?: string;
    }
  | {
      type: "bg3d-with-skeleton-to-glb";
      bg3dBuffer: ArrayBuffer;
      skeletonData: SkeletonResource;
      requestId?: string;
    }
  | {
      type: "model-with-skeleton-to-glb";
      modelBuffer: ArrayBuffer;
      skeletonData: SkeletonResource;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-glb";
      parsed: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-bg3d";
      parsed: BG3DParseResult;
      requestId?: string;
    };

export type BG3DGltfWorkerResponse =
  | {
      type: "bg3d-to-glb";
      result: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d";
      result: ArrayBuffer;
      normalizedGlb?: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      warnings?: readonly GltfCompatibilityWarning[];
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      bg3dResult: ArrayBuffer;
      normalizedGlb?: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      warnings?: readonly GltfCompatibilityWarning[];
      requestId?: string;
    }
  | {
      type: "bg3d-with-skeleton-to-glb";
      result: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "model-with-skeleton-to-glb";
      result: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-glb";
      result: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-bg3d";
      result: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      requestId?: string;
    }
  | {
      type: "error";
      error: string;
      skeletonResult?: ArrayBuffer;
      requestId?: string;
    };

self.onmessage = (e: MessageEvent<BG3DGltfWorkerMessage>) => {
  const msg = e.data;
  const requestId = msg.requestId;
  return (async () => {
    if (msg.type === "bg3d-to-glb") {
      const parseResult = parseModelBuffer(msg.buffer);
      if (parseResult.isErr()) {
        const response = {
          type: "error",
          error: parseResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response = {
        type: "bg3d-to-glb",
        result: arrBuffer,
        parsed,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-with-skeleton-to-glb") {
      const parseResult = parseBG3DWithSkeletonResource(
        msg.bg3dBuffer,
        msg.skeletonData,
      );
      if (parseResult.isErr()) {
        const response = {
          type: "error",
          error: parseResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response = {
        type: "bg3d-with-skeleton-to-glb",
        result: arrBuffer,
        parsed,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response);
    } else if (msg.type === "model-with-skeleton-to-glb") {
      const parseResult = parseBG3DWithSkeletonResource(
        msg.modelBuffer,
        msg.skeletonData,
      );
      if (parseResult.isErr()) {
        const response = {
          type: "error",
          error: parseResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response = {
        type: "model-with-skeleton-to-glb",
        result: arrBuffer,
        parsed,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-glb") {
      const doc = bg3dParsedToGLTF(msg.parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response = {
        type: "bg3d-parsed-to-glb",
        result: arrBuffer,
        parsed: msg.parsed,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-bg3d") {
      const bg3dBuffer = bg3dParsedToBG3D(msg.parsed);
      const response = {
        type: "bg3d-parsed-to-bg3d",
        result: bg3dBuffer,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response);
    } else if (msg.type === "glb-to-bg3d") {
      const compatibleResult = await normalizeGltfAsset(
        msg.fileName ?? "model.glb",
        msg.buffer,
      );
      if (compatibleResult.isErr()) {
        const response = {
          type: "error",
          error: compatibleResult.error.message,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const parsedResult = Result.fromThrowable(
        () => gltfToBG3D(compatibleResult.value.document),
        (error: unknown) => String(error),
      )();
      if (parsedResult.isErr()) {
        const response = {
          type: "error",
          error: parsedResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const bg3dResult = Result.fromThrowable(
        () => bg3dParsedToBG3D(parsedResult.value),
        (error: unknown) => String(error),
      )();
      if (bg3dResult.isErr()) {
        const response = {
          type: "error",
          error: bg3dResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }

      const response = {
        type: "glb-to-bg3d",
        result: bg3dResult.value,
        normalizedGlb: compatibleResult.value.normalizedGlb,
        parsed: parsedResult.value,
        warnings: compatibleResult.value.warnings,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response, {
        transfer: [compatibleResult.value.normalizedGlb],
      });
    } else if (msg.type === "glb-to-bg3d-with-skeleton") {
      const compatibleResult = await normalizeGltfAsset(
        msg.fileName ?? "model.glb",
        msg.buffer,
      );
      if (compatibleResult.isErr()) {
        const response = {
          type: "error",
          error: compatibleResult.error.message,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const parsedResult = Result.fromThrowable(
        () => gltfToBG3D(compatibleResult.value.document),
        (error: unknown) => String(error),
      )();
      if (parsedResult.isErr()) {
        const response = {
          type: "error",
          error: parsedResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }
      const bg3dResult = Result.fromThrowable(
        () => bg3dParsedToBG3D(parsedResult.value),
        (error: unknown) => String(error),
      )();
      if (bg3dResult.isErr()) {
        const response = {
          type: "error",
          error: bg3dResult.error,
          requestId,
        } satisfies BG3DGltfWorkerResponse;
        self.postMessage(response);
        return;
      }

      const response = {
        type: "glb-to-bg3d-with-skeleton",
        bg3dResult: bg3dResult.value,
        normalizedGlb: compatibleResult.value.normalizedGlb,
        parsed: parsedResult.value,
        warnings: compatibleResult.value.warnings,
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage.call(self, response, {
        transfer: [compatibleResult.value.normalizedGlb],
      });
    } else {
      const response = {
        type: "error",
        error: "Unknown conversion type",
        requestId,
      } satisfies BG3DGltfWorkerResponse;
      self.postMessage(response);
    }
  })().catch((error: unknown) => {
    const response = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
      requestId,
    } satisfies BG3DGltfWorkerResponse;
    self.postMessage(response);
  });
};
