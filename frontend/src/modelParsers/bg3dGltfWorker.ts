import { bg3dParsedToBG3D, parseBG3D, type BG3DParseResult } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { parse3DMF } from "./parse3dmf";
import { WebIO } from "@gltf-transform/core";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { isErr, Result, fromPromise } from "../types/result";

function toExactArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return copy;
}

// Helper function to detect file format and parse accordingly
function parseModelBuffer(buffer: ArrayBuffer): Result<BG3DParseResult, Error> {
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
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      buffer: ArrayBuffer;
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
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      bg3dResult: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      parsed?: BG3DParseResult;
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

self.onmessage = async (e: MessageEvent<BG3DGltfWorkerMessage>) => {
  const msg = e.data;
  const requestId = msg.requestId;
  const result = await fromPromise((async () => {
    if (msg.type === "bg3d-to-glb") {
      const parseResult = parseModelBuffer(msg.buffer);
      if (isErr(parseResult)) {
        const response: BG3DGltfWorkerResponse = {
          type: "error",
          error: parseResult.error.message,
          requestId,
        };
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-to-glb",
        result: arrBuffer,
        parsed: parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-with-skeleton-to-glb") {
      const parseResult = parseBG3DWithSkeletonResource(msg.bg3dBuffer, msg.skeletonData);
      if (isErr(parseResult)) {
        const response: BG3DGltfWorkerResponse = {
          type: "error",
          error: parseResult.error.message,
          requestId,
        };
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-with-skeleton-to-glb",
        result: arrBuffer,
        parsed: parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "model-with-skeleton-to-glb") {
      const parseResult = parseBG3DWithSkeletonResource(
        msg.modelBuffer,
        msg.skeletonData,
      );
      if (isErr(parseResult)) {
        const response: BG3DGltfWorkerResponse = {
          type: "error",
          error: parseResult.error.message,
          requestId,
        };
        self.postMessage(response);
        return;
      }
      const parsed = parseResult.value;
      const doc = bg3dParsedToGLTF(parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response: BG3DGltfWorkerResponse = {
        type: "model-with-skeleton-to-glb",
        result: arrBuffer,
        parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-glb") {
      const doc = bg3dParsedToGLTF(msg.parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = toExactArrayBuffer(glbBuffer);

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-parsed-to-glb",
        result: arrBuffer,
        parsed: msg.parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-bg3d") {
      const bg3dBuffer = bg3dParsedToBG3D(msg.parsed);
      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-parsed-to-bg3d",
        result: bg3dBuffer,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "glb-to-bg3d") {
      const io = new WebIO();
      const doc = await io.readBinary(new Uint8Array(msg.buffer));
      const parsedBg3d = await gltfToBG3D(doc);
      const bg3d = bg3dParsedToBG3D(parsedBg3d);

      const response: BG3DGltfWorkerResponse = {
        type: "glb-to-bg3d",
        result: bg3d,
        parsed: parsedBg3d,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "glb-to-bg3d-with-skeleton") {
      const io = new WebIO();
      const doc = await io.readBinary(new Uint8Array(msg.buffer));
      const parsedBg3d = await gltfToBG3D(doc);
      const bg3d = bg3dParsedToBG3D(parsedBg3d);

      const response: BG3DGltfWorkerResponse = {
        type: "glb-to-bg3d-with-skeleton",
        bg3dResult: bg3d,
        parsed: parsedBg3d,
        requestId,
      };
      self.postMessage.call(self, response);
    } else {
      const response: BG3DGltfWorkerResponse = {
        type: "error",
        error: "Unknown conversion type",
        requestId,
      };
      self.postMessage(response);
    }
  })());
  if (result.isErr()) {
    const response: BG3DGltfWorkerResponse = {
      type: "error",
      error: result.error instanceof Error ? result.error.message : String(result.error),
      requestId,
    };
    self.postMessage(response);
  }
};
