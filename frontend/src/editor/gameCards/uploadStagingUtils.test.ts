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

  it("only accepts companion metadata when the feature is enabled", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        isNanosaur1: true,
        hasStagedLevel: false,
        hasStagedTexture: false,
        levelFileType: ".ter",
        textureFileType: ".trt",
        levelMetadataEnabled: false,
      }),
    ).toBe(".ter,.trt");
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        isNanosaur1: false,
        isMightyMike: true,
        hasStagedLevel: false,
        hasStagedTexture: false,
        levelFileType: ".map",
        textureFileType: ".tileset",
        levelMetadataEnabled: true,
      }),
    ).toBe(".map,.tileset,.Meta.rsrc");
    expect(
      classifyUploadFile("level.Meta.rsrc", ".ter", ".trt", false, true, false),
    ).toBe("invalid");
    expect(
      classifyUploadFile("level.Meta.rsrc", ".ter", ".trt", false, true, true),
    ).toBe("metadata");
  });
});
