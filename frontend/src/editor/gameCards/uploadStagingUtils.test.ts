import { describe, expect, it } from "vitest";
import {
  classifyUploadFile,
  getUploadAcceptTypes,
} from "./uploadStagingUtils";

describe("game-card upload staging", () => {
  it("accepts Mighty Mike numbered map files and paired tilesets", () => {
    expect(classifyUploadFile("candy.map-1", ".map", ".tileset", false)).toBe(
      "level",
    );
    expect(classifyUploadFile("candy.tileset", ".map", ".tileset", false)).toBe(
      "texture",
    );
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".map",
        textureFileType: ".tileset",
        hasStagedLevel: false,
        hasStagedTexture: false,
      }),
    ).toBe(".map,.tileset");
  });

  it("does not broaden ordinary level matching to numbered suffixes", () => {
    expect(classifyUploadFile("level.ter-1", ".ter", ".trt", false)).toBe(
      "invalid",
    );
  });
});
