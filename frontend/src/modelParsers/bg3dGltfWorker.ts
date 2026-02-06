import { bg3dParsedToBG3D, parseBG3D, type BG3DParseResult } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { parse3DMF } from "./parse3dmf";
import { WebIO } from "@gltf-transform/core";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { isErr, Result } from "../types/result";

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
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d";
      result: ArrayBuffer;
      requestId?: string;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      bg3dResult: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
      requestId?: string;
    }
  | {
      type: "bg3d-with-skeleton-to-glb";
      result: ArrayBuffer;
      parsed?: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-glb";
      result: ArrayBuffer;
      parsed: BG3DParseResult;
      requestId?: string;
    }
  | {
      type: "bg3d-parsed-to-bg3d";
      result: ArrayBuffer;
      requestId?: string;
    }
  | {
      type: "error";
      error: string;
      requestId?: string;
    };

self.onmessage = async (e: MessageEvent<BG3DGltfWorkerMessage>) => {
  const msg = e.data;
  const requestId = msg.requestId;
  console.log("Worker received message:", msg.type);
  try {
    if (msg.type === "bg3d-to-glb") {
      console.log("Converting model (BG3D/3DMF) to GLB");
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
      console.log("Parsed model:", parsed);
      const doc = bg3dParsedToGLTF(parsed);
      console.log("Converting parsed model to GLTF document");
      console.log("GLTF Document:", doc);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = new Uint8Array(glbBuffer).buffer;

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-to-glb",
        result: arrBuffer,
        parsed: parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-with-skeleton-to-glb") {
      console.log("Converting BG3D with skeleton to GLB");
      console.log("BG3D buffer size:", msg.bg3dBuffer.byteLength);
      console.log("Skeleton data:", msg.skeletonData);
      
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
      console.log("Parsed BG3D with skeleton:", parsed);
      console.log("Skeleton in parsed result:", parsed.skeleton ? `${parsed.skeleton.bones.length} bones, ${parsed.skeleton.animations.length} animations` : "none");
      
      const doc = bg3dParsedToGLTF(parsed);
      console.log("Converting parsed BG3D with skeleton to GLTF document");
      console.log("GLTF Document with skeleton:", doc);
      
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = new Uint8Array(glbBuffer).buffer;
      console.log("Generated GLB buffer size:", arrBuffer.byteLength);

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-with-skeleton-to-glb",
        result: arrBuffer,
        parsed: parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-glb") {
      console.log("Converting parsed BG3D to GLB");
      const doc = bg3dParsedToGLTF(msg.parsed);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = new Uint8Array(glbBuffer).buffer;

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-parsed-to-glb",
        result: arrBuffer,
        parsed: msg.parsed,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-bg3d") {
      console.log("Converting parsed BG3D back to BG3D binary");
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
      const parsed = gltfToBG3D(doc);
      const bg3d = bg3dParsedToBG3D(await parsed);
      const response: BG3DGltfWorkerResponse = {
        type: "glb-to-bg3d",
        result: bg3d,
        requestId,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "glb-to-bg3d-with-skeleton") {
      const io = new WebIO();
      const doc = await io.readBinary(new Uint8Array(msg.buffer));
      const parsed = gltfToBG3D(doc);
      const bg3d = bg3dParsedToBG3D(await parsed);
      
      // TODO: Generate skeleton resource file if animations exist
      let skeletonResult: ArrayBuffer | undefined;
      const parsedData = await parsed;
      if (parsedData.skeleton?.animations && parsedData.skeleton.animations.length > 0) {
        // For now, we'll need to implement skeleton generation from BG3D
        console.log("Skeleton generation from glTF not yet implemented");
      }
      
      const response: BG3DGltfWorkerResponse = {
        type: "glb-to-bg3d-with-skeleton",
        bg3dResult: bg3d,
        skeletonResult,
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
  } catch (err) {
    const response: BG3DGltfWorkerResponse = {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
      requestId,
    };
    self.postMessage(response);
  }
};
