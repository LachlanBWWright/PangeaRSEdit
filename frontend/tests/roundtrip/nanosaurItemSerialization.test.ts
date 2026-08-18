import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  nanosaur1LevelToLevelData,
  parseNanosaur1Level,
} from "../../src/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";
import {
  findNanosaurBinaryDifferenceRanges,
  formatNanosaurBinaryDifferenceRanges,
} from "./nanosaurBinaryDiagnostics";

const LEVEL_PATH = join(
  import.meta.dirname,
  "../../public/assets/nanosaur/terrain/Level1.ter",
);

function readLevel(): {
  original: Uint8Array;
  rawLevelData: ReturnType<typeof parseNanosaur1Level>;
  levelData: ReturnType<typeof nanosaur1LevelToLevelData>;
} {
  const source = readFileSync(LEVEL_PATH);
  const original = new Uint8Array(source.byteLength);
  original.set(source);
  const rawLevelData = parseNanosaur1Level(original.buffer);
  return {
    original,
    rawLevelData,
    levelData: nanosaur1LevelToLevelData(rawLevelData),
  };
}

function compileLevel(
  levelData: ReturnType<typeof nanosaur1LevelToLevelData>,
  rawLevelData: ReturnType<typeof parseNanosaur1Level>,
): Uint8Array {
  const result = compileNanosaur1Level(levelData, rawLevelData);
  if (result.isErr()) {
    expect.fail(`Nanosaur level compilation failed: ${result.error}`);
  }
  return new Uint8Array(result.value);
}

function expectOnlyObjectFieldChange(
  original: Uint8Array,
  compiled: Uint8Array,
  rawLevelData: ReturnType<typeof parseNanosaur1Level>,
  expectedStart: number,
  expectedEndExclusive: number,
  expectedField: string,
): void {
  const differences = findNanosaurBinaryDifferenceRanges(
    original,
    compiled,
    rawLevelData,
  );
  expect(
    differences,
    formatNanosaurBinaryDifferenceRanges(differences),
  ).toHaveLength(1);
  const difference = differences[0];
  expect(difference).toBeDefined();
  if (!difference) return;
  expect(difference.start).toBe(expectedStart);
  expect(difference.endExclusive).toBe(expectedEndExclusive);
  expect(difference.location).toMatchObject({
    section: "object list",
    record: 0,
    field: expectedField,
  });
}

describe("Nanosaur 1 item binary serialization", () => {
  it("preserves raw parameters when only the editor z position changes", () => {
    const { original, rawLevelData, levelData } = readLevel();
    const rawItem = rawLevelData.objectList[0];
    const editorItem = levelData.Itms?.[1000]?.obj[0];
    expect(rawItem).toBeDefined();
    expect(editorItem).toBeDefined();
    if (!rawItem || !editorItem) return;

    const nextZ = rawItem.y ^ 0x0101;
    editorItem.z = nextZ;
    const compiled = compileLevel(levelData, rawLevelData);
    const itemOffset = rawLevelData.header.objectListOffset + 4;
    expectOnlyObjectFieldChange(
      original,
      compiled,
      rawLevelData,
      itemOffset + 2,
      itemOffset + 4,
      "y/z",
    );
  });

  it("changes only the raw parameter bytes when one editor parameter changes", () => {
    const { original, rawLevelData, levelData } = readLevel();
    const rawItem = rawLevelData.objectList[0];
    const editorItem = levelData.Itms?.[1000]?.obj[0];
    expect(rawItem).toBeDefined();
    expect(editorItem).toBeDefined();
    if (!rawItem || !editorItem) return;

    const originalParm = rawItem.parm[0];
    editorItem.p0 = originalParm === 0xff ? originalParm - 1 : originalParm + 1;
    const compiled = compileLevel(levelData, rawLevelData);
    const itemOffset = rawLevelData.header.objectListOffset + 4;
    expectOnlyObjectFieldChange(
      original,
      compiled,
      rawLevelData,
      itemOffset + 6,
      itemOffset + 7,
      "parm",
    );
  });
});
