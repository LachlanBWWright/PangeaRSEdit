// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { parseSkeletonRsrc } from "./parseSkeletonRsrc";
import fs from "fs";
import path from "path";
import "@vitest/web-worker";

import { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
import PyodideWorker from "@/python/pyodideWorker?worker";
import { loadPyodide } from "pyodide";

describe("parseSkeletonRsrc", () => {
  it("parses EliteBrainAlien.skeleton.rsrc without error", async () => {
    // Load the test skeleton resource file as ArrayBuffer

    const filePath = path.resolve(
      __dirname,
      "testSkeletons/EliteBrainAlien.skeleton.rsrc",
    );
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    console.log("LOCALPYODIDETEST");
    const pyodideRes = await loadPyodide({
      indexURL: "src/assets/pyodide",
    });
    console.log(`Pyodide initialized with indexURL: ${pyodideRes}`);

    console.log(`Loaded skeleton resource file: ${filePath}`);
    console.log(`ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
    const pyodideWorker = new PyodideWorker();
    pyodideWorker.postMessage({
      type: "init",
    } satisfies PyodideMessage);
    console.log("Sent init message to pyodide worker");

    // Wait for worker to send initRes
    await new Promise<void>((resolve) => {
      pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
        if (event.data.type === "initRes") {
          resolve();
        } else {
          console.error("Unexpected message from pyodide worker:", event.data);
        }
      };
    });

    console.log("Initialized Pyodide worker");
    // Call parseSkeletonRsrc (this is a placeholder, actual test will need a real worker)
    // Here we just check that the function can be called without throwing
    const res = await parseSkeletonRsrc({
      pyodideWorker,
      json_blob: arrayBuffer,
    });
    console.log("Parsed skeleton resource successfully", res);
  }, 50_000);
});
