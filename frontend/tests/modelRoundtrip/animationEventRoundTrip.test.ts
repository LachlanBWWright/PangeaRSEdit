import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrc } from "../../src/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3D } from "../../src/modelParsers/parseBG3D";
import { unwrap } from "../../src/types/result";
import { bg3dParsedToGLTF, gltfToBG3D } from "../../src/modelParsers/parsedBg3dGitfConverter";

describe("BG3D animation events round-trip", () => {
  const bg3dPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.bg3d",
  );
  const skeletonPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
  );

  it("stores ANIMEVENT data in glTF extras and restores it on import", async () => {
    const bg3dBytes = readFileSync(bg3dPath);
    const skeletonBytes = readFileSync(skeletonPath);

    const skeleton = await parseSkeletonRsrc(
      skeletonBytes.buffer.slice(
        skeletonBytes.byteOffset,
        skeletonBytes.byteOffset + skeletonBytes.byteLength,
      ),
    );

    const parsedResult = parseBG3D(
      bg3dBytes.buffer.slice(
        bg3dBytes.byteOffset,
        bg3dBytes.byteOffset + bg3dBytes.byteLength,
      ),
      skeleton,
    );
    const parsed = unwrap(parsedResult);

    if (!parsed.skeleton) {
      throw new Error("Expected skeleton data");
    }

    const sourceIndex = parsed.skeleton.animations.findIndex(
      (animation) => animation.events.length > 0,
    );
    expect(sourceIndex).toBeGreaterThanOrEqual(0);

    const sourceAnimation = parsed.skeleton.animations[sourceIndex];
    if (!sourceAnimation) {
      throw new Error("Expected animation with events");
    }

    const gltfDoc = bg3dParsedToGLTF(parsed);
    const gltfAnimation = gltfDoc.getRoot().listAnimations()[sourceIndex];
    expect(gltfAnimation).toBeDefined();

    const gltfExtras = gltfAnimation?.getExtras() as
      | Record<string, unknown>
      | undefined;
    const gltfPangears = gltfExtras?.pangears as
      | { numAnimEvents?: number; events?: { time: number; type: number; value: number }[] }
      | undefined;
    expect(gltfPangears?.numAnimEvents).toBe(sourceAnimation.events.length);
    expect(gltfPangears?.events).toEqual(sourceAnimation.events);

    const roundtrip = await gltfToBG3D(gltfDoc);
    expect(roundtrip.skeleton?.animations[sourceIndex]?.numAnimEvents).toBe(
      sourceAnimation.events.length,
    );
    expect(roundtrip.skeleton?.animations[sourceIndex]?.events).toEqual(
      sourceAnimation.events,
    );
  });
});
