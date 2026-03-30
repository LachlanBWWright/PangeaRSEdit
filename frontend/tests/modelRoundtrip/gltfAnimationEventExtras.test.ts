import { Document, WebIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import {
  extractAnimationMetadataFromGlb,
  updateGlbAnimationEvents,
} from "../../src/modelParsers/gltfAnimationEvents";

describe("generic glTF animation event extras", () => {
  it("stores ANIMEVENT data on a plain GLB and restores it", async () => {
    const doc = new Document();
    const buffer = doc.createBuffer("buffer");
    const scene = doc.createScene("scene");
    doc.getRoot().setDefaultScene(scene);

    const node = doc.createNode("Node");
    scene.addChild(node);

    const input = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(new Float32Array([0, 1]))
      .setBuffer(buffer);
    const output = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0]))
      .setBuffer(buffer);
    const sampler = doc
      .createAnimationSampler()
      .setInput(input)
      .setOutput(output)
      .setInterpolation("LINEAR");
    const channel = doc
      .createAnimationChannel()
      .setTargetNode(node)
      .setTargetPath("translation")
      .setSampler(sampler);
    doc
      .createAnimation("PlainGLB")
      .addSampler(sampler)
      .addChannel(channel)
      .setExtras({
        pangears: {
          numAnimEvents: 1,
          events: [{ time: 4, type: 1, value: 9 }],
        },
      });

    const io = new WebIO();
    const glbBuffer = await io.writeBinary(doc);
    const sourceBuffer = new Uint8Array(glbBuffer).buffer;

    const updatedBuffer = await updateGlbAnimationEvents(sourceBuffer, 0, [
      { time: 12, type: 8, value: 3 },
      { time: 2, type: 0, value: 0 },
    ]);

    const metadata = await extractAnimationMetadataFromGlb(updatedBuffer);
    expect(metadata.PlainGLB?.eventCount).toBe(2);
    expect(metadata.PlainGLB?.events).toEqual([
      { time: 2, type: 0, value: 0 },
      { time: 12, type: 8, value: 3 },
    ]);
  });
});
