import { describe, expect, it } from "vitest";
import { classifyUploadFile, getUploadAcceptTypes } from "./uploadStagingUtils";

describe("getUploadAcceptTypes", () => {
  it("allows bugdom2 tunnel upload before staging", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: true,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: false,
        hasStagedTexture: false,
      }),
    ).toBe(".ter.rsrc,.ter,.tun");
  });

  it("restricts to missing counterpart when one staged file exists", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: true,
        hasStagedTexture: false,
      }),
    ).toBe(".ter");
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: false,
        hasStagedTexture: true,
      }),
    ).toBe(".ter.rsrc");
  });

  it("returns level type only for single-file game uploads", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".map",
        textureFileType: null,
        hasStagedLevel: false,
        hasStagedTexture: false,
      }),
    ).toBe(".map");
  });

  it("classifies staged files by expected kinds", () => {
    expect(classifyUploadFile("Level1.tun", ".ter.rsrc", ".ter", true)).toBe(
      "tunnel",
    );
    expect(classifyUploadFile("Level1.ter.rsrc", ".ter.rsrc", ".ter", false)).toBe(
      "level",
    );
    expect(classifyUploadFile("Level1.ter", ".ter.rsrc", ".ter", false)).toBe(
      "texture",
    );
    expect(classifyUploadFile("notes.txt", ".ter.rsrc", ".ter", false)).toBe(
      "invalid",
    );
  });

  it("restricts Bugdom 2 staged uploads to the missing paired file type", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: true,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: true,
        hasStagedTexture: false,
      }),
    ).toBe(".ter");
    expect(
      getUploadAcceptTypes({
        isBugdom2: true,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: false,
        hasStagedTexture: true,
      }),
    ).toBe(".ter.rsrc");
  });
});
