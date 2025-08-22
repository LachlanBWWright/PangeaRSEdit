import { bg3dParsedToBG3D, parseBG3D, BG3DParseResult } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
// Commented out unused import to fix build error
// import { bg3dSkeletonToSkeletonResource, skeletonResourceToBinary } from "./skeletonExport";
import { WebIO } from "@gltf-transform/core";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";

// Message types
export type BG3DGltfWorkerMessage =
  | {
      type: "bg3d-to-glb";
      buffer: ArrayBuffer;
    }
  | {
      type: "bg3d-with-skeleton-to-glb";
      bg3dBuffer: ArrayBuffer;
      skeletonData: SkeletonResource;
    }
  | {
      type: "glb-to-bg3d";
      buffer: ArrayBuffer;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      buffer: ArrayBuffer;
    }
  | {
      type: "bg3d-parsed-to-glb";
      parsed: BG3DParseResult;
    }
  | {
      type: "bg3d-parsed-to-bg3d";
      parsed: BG3DParseResult;
    };

export type BG3DGltfWorkerResponse =
  | {
      type: "bg3d-to-glb";
      result: ArrayBuffer;
      parsed: BG3DParseResult;
    }
  | {
      type: "bg3d-with-skeleton-to-glb";
      result: ArrayBuffer;
      parsed: BG3DParseResult;
    }
  | {
      type: "glb-to-bg3d";
      result: ArrayBuffer;
    }
  | {
      type: "glb-to-bg3d-with-skeleton";
      bg3dResult: ArrayBuffer;
      skeletonResult?: ArrayBuffer;
    }
  | {
      type: "bg3d-parsed-to-glb";
      result: ArrayBuffer;
    }
  | {
      type: "bg3d-parsed-to-bg3d";
      result: ArrayBuffer;
    }
  | {
      type: "error";
      error: string;
    };

self.onmessage = async (e: MessageEvent<BG3DGltfWorkerMessage>) => {
  const msg = e.data;
  try {
    if (msg.type === "bg3d-to-glb") {
      console.log("Converting BG3D to GLB");
      const parsed = parseBG3D(msg.buffer);
      console.log("Parsed BG3D:", parsed);
      const doc = bg3dParsedToGLTF(parsed);
      console.log("Converting parsed BG3D to GLTF document");
      console.log("GLTF Document:", doc);
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = new Uint8Array(glbBuffer).buffer;

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-to-glb",
        result: arrBuffer,
        parsed: parsed,
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-with-skeleton-to-glb") {
      console.log("Converting BG3D with skeleton to GLB");
      const parsed = parseBG3DWithSkeletonResource(msg.bg3dBuffer, msg.skeletonData);
      console.log("Parsed BG3D with skeleton:", parsed);
      const doc = bg3dParsedToGLTF(parsed);
      console.log("Converting parsed BG3D with skeleton to GLTF document");
      const io = new WebIO();
      const glbBuffer = await io.writeBinary(doc);
      const arrBuffer = new Uint8Array(glbBuffer).buffer;

      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-with-skeleton-to-glb",
        result: arrBuffer,
        parsed: parsed,
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
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "bg3d-parsed-to-bg3d") {
      console.log("Converting parsed BG3D back to BG3D binary");
      const bg3dBuffer = bg3dParsedToBG3D(msg.parsed);
      const response: BG3DGltfWorkerResponse = {
        type: "bg3d-parsed-to-bg3d",
        result: bg3dBuffer,
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
      };
      self.postMessage.call(self, response);
    } else if (msg.type === "glb-to-bg3d-with-skeleton") {
      const io = new WebIO();
      const doc = await io.readBinary(new Uint8Array(msg.buffer));
      const parsed = gltfToBG3D(doc);
      const bg3d = bg3dParsedToBG3D(await parsed);
      
      // TODO: Generate skeleton resource file if animations exist
      let skeletonResult: ArrayBuffer | undefined;
      if ((await parsed).skeleton && (await parsed).skeleton!.animations.length > 0) {
        // For now, we'll need to implement skeleton generation from BG3D
        console.log("Skeleton generation from glTF not yet implemented");
      }
      
      const response: BG3DGltfWorkerResponse = {
        type: "glb-to-bg3d-with-skeleton",
        bg3dResult: bg3d,
        skeletonResult,
      };
      self.postMessage.call(self, response);
    } else {
      throw new Error("Unknown conversion type");
    }
  } catch (err) {
    const response: BG3DGltfWorkerResponse = {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
