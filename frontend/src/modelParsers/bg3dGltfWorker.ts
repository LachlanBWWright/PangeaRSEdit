import { g } from "vitest/dist/chunks/suite.d.FvehnV49.js";
import { bg3dParsedToBG3D, parseBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { WebIO } from "@gltf-transform/core";

// Message types
export type BG3DGltfWorkerMessage =
  | {
      type: "bg3d-to-glb";
      buffer: ArrayBuffer;
    }
  | {
      type: "glb-to-bg3d";
      buffer: ArrayBuffer;
    };

export type BG3DGltfWorkerResponse =
  | {
      type: "bg3d-to-glb";
      result: ArrayBuffer;
    }
  | {
      type: "glb-to-bg3d";
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
