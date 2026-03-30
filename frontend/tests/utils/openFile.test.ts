import { describe, expect, test } from "vitest";
import { getTrtTextureUrl } from "@/editor/loadLogic/openFile";

describe("getTrtTextureUrl", () => {
  test("reuses Level1.trt for the Nanosaur extreme terrain", () => {
    expect(getTrtTextureUrl("assets/nanosaur/terrain/Level1Pro.ter")).toBe(
      "assets/nanosaur/terrain/Level1.trt",
    );
  });

  test("keeps standard terrain texture names unchanged", () => {
    expect(getTrtTextureUrl("assets/nanosaur/terrain/Level1.ter")).toBe(
      "assets/nanosaur/terrain/Level1.trt",
    );
  });
});
