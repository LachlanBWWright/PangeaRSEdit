import { describe, expect, it } from "vitest";
import { BillyFrontierGlobals, MightyMikeGlobals, NanosaurGlobals } from "@/data/globals/globals";
import type { MetadataResource } from "@/python/structSpecs/LevelTypes";
import {
  getMetadataCompanionFilename,
  serializeMetadataResourceForkBytes,
} from "./serializeLevelBytes";
import {
  normalizeMetadataResourceFromFork,
  parseMetadataResourceFork,
} from "@/editor/subviews/metadata/metadataResource";

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

describe("Meta resource serialization", () => {
  it("keeps Mighty Mike map suffixes in companion filenames", () => {
    expect(getMetadataCompanionFilename("jurassic.map-1", MightyMikeGlobals.GAME_TYPE)).toBe(
      "jurassic.map-1.Meta.rsrc",
    );
    expect(getMetadataCompanionFilename("Level1.ter", NanosaurGlobals.GAME_TYPE)).toBe(
      "Level1.Meta.rsrc",
    );
  });

  it("serializes a standalone companion fork for Nanosaur 1", () => {
    const resource: MetadataResource = {
      1000: {
        name: "Level Metadata",
        obj: {
          schemaVersion: 1,
          game: "Nanosaur",
          identity: "Nanosaur",
          properties: { "level.id": "0" },
        },
        order: 0,
      },
    };

    const result = serializeMetadataResourceForkBytes(resource, NanosaurGlobals);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.byteLength).toBeGreaterThan(0);
  });

  it("normalizes the raw Meta payload back into editable properties", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      game: "Mighty Mike",
      identity: "Jurassic 1",
      properties: { "scene.id": "0" },
    });
    const bytes = new TextEncoder().encode(json);
    let hex = "";
    for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
    const result = normalizeMetadataResourceFromFork({
      Meta: { "1000": { data: hex } },
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toMatchObject({ Meta: { "1000": { obj: { identity: "Jurassic 1" } } } });
  });

  it("parses a valid companion and leaves malformed companions inactive", async () => {
    const resource: MetadataResource = {
      1000: {
        name: "Level Metadata",
        obj: {
          schemaVersion: 1,
          game: "Nanosaur",
          identity: "Level 1",
          properties: { "level.id": "0" },
        },
        order: 0,
      },
    };
    const bytesResult = serializeMetadataResourceForkBytes(resource, NanosaurGlobals);
    expect(bytesResult.isOk()).toBe(true);
    if (bytesResult.isErr()) return;

    const parsedResult = await parseMetadataResourceFork(
      asArrayBuffer(bytesResult.value),
      NanosaurGlobals.STRUCT_SPECS,
    );
    expect(parsedResult.isOk() ? parsedResult.value : undefined).toEqual(resource[1000].obj);

    const malformedResult = await parseMetadataResourceFork(
      asArrayBuffer(new TextEncoder().encode("not a resource fork")),
      NanosaurGlobals.STRUCT_SPECS,
    );
    expect(malformedResult.isErr()).toBe(true);
  });

  it("round-trips a Mighty Mike companion resource with the port identifier", async () => {
    const resource: MetadataResource = {
      1000: {
        name: "Level Metadata",
        obj: {
          schemaVersion: 1,
          game: "mightymike",
          identity: "Jurassic 1",
          properties: { "scene.sound": "bargain" },
        },
        order: 0,
      },
    };
    const bytesResult = serializeMetadataResourceForkBytes(resource, MightyMikeGlobals);
    expect(bytesResult.isOk()).toBe(true);
    if (bytesResult.isErr()) return;

    const parsedResult = await parseMetadataResourceFork(
      asArrayBuffer(bytesResult.value),
      MightyMikeGlobals.STRUCT_SPECS,
    );
    expect(parsedResult.isOk() ? parsedResult.value : undefined).toEqual(
      resource[1000].obj,
    );
  });

  it("round-trips Billy Frontier metadata as an embedded resource", async () => {
    const resource: MetadataResource = {
      1000: {
        name: "Level Metadata",
        obj: {
          schemaVersion: 1,
          game: "billyfrontier",
          identity: "Town Shootout",
          properties: { "area.mode": "target-practice" },
        },
        order: 0,
      },
    };
    const bytesResult = serializeMetadataResourceForkBytes(resource, BillyFrontierGlobals);
    expect(bytesResult.isOk()).toBe(true);
    if (bytesResult.isErr()) return;

    const parsedResult = await parseMetadataResourceFork(
      asArrayBuffer(bytesResult.value),
      BillyFrontierGlobals.STRUCT_SPECS,
    );
    expect(parsedResult.isOk() ? parsedResult.value : undefined).toEqual(
      resource[1000].obj,
    );
  });
});
