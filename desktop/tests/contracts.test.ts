import { describe, expect, it } from "vitest";
import { hostRequestSchema, projectManifestSchema, relativePathSchema } from "@pangea/desktop-contracts";

const manifest = { kind: "pangea-editor-project", version: 1, name: "Contract", game: "OttoMatic", levels: [] };

describe("renderer request validation", () => {
  it.each([
    "", "/absolute", "../parent", "a/../b", "a/./b", "a//b", "a/", "C:/file", "a\\b", "a\u0000b",
    ".git/config", "Data/.hidden", "Data/CON", "Data/con.lua", "Data/LPT1.txt", "Data/aux", "Data/file.", "Data/file ",
    "Data/file?", "Data/file*", "Data/file:stream", "x".repeat(241),
  ])("rejects unsafe cross-platform paths: %j", (relative) => {
    expect(relativePathSchema.safeParse(relative).success).toBe(false);
  });

  it.each(["Data/Scripts/user.lua", ".pangea/levels/one/level.ter.rsrc", "Data/Scripts/.luarc.json", "Assets/模型.glb"])
  ("accepts supported project paths: %s", (relative) => {
    expect(relativePathSchema.safeParse(relative).success).toBe(true);
  });

  it.each([
    null, {}, { operation: "execute", command: "sh" },
    { operation: "project.create", name: "", game: "OttoMatic" },
    { operation: "project.create", name: "Name", game: "Unknown" },
    { operation: "project.read", paths: ["../escape"] },
    { operation: "project.read", paths: Array.from({ length: 4097 }, () => "file") },
    { operation: "project.save", revision: "r", manifest, files: [{ path: "file", bytes: [1, 2] }] },
    { operation: "project.save", revision: "r", manifest, files: [], removed: [".git/config"] },
    { operation: "project.recover", action: "delete-all" },
    { operation: "games.install", game: "OttoMatic", tag: "v1", kind: "unknown" },
    { operation: "games.install", game: "OttoMatic", tag: "v1", kind: "editor-assets" },
    { operation: "games.test", game: "OttoMatic", args: Array.from({ length: 13 }, () => "0"), files: [] },
    { operation: "host.dirty", dirty: "true" },
  ])("rejects malformed requests: %j", (request) => {
    expect(hostRequestSchema.safeParse(request).success).toBe(false);
  });

  it("accepts structured-clone binary payloads and fills compatible defaults", () => {
    const request = hostRequestSchema.safeParse({ operation: "project.save", revision: "r", manifest,
      files: [{ path: "Data/level.ter", bytes: new Uint8Array([0, 255]) }] });
    expect(request.success && request.data.operation === "project.save" && request.data.removed).toEqual([]);
    const catalog = hostRequestSchema.safeParse({ operation: "games.catalog" });
    expect(catalog.success && catalog.data).toEqual({ operation: "games.catalog", prerelease: false });
  });

  it("rejects duplicate custom level IDs", () => {
    const level = { id: "one", name: "One", baseLevel: 0, primary: "Data/level.ter", files: ["Data/level.ter"] };
    expect(projectManifestSchema.safeParse({ ...manifest, levels: [level, level] }).success).toBe(false);
  });
});
