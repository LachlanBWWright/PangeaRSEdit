/**
 * Tests for item parameter citation extraction
 */

import { describe, it, expect } from "vitest";
import { extractCitationsFromParams } from "@/data/items/verification/extractCitations";
import type { ItemParams } from "@/data/items/itemParams";

describe("extractCitationsFromParams", () => {
  it("should extract citations from Integer parameters", () => {
    const params: Record<number, ItemParams> = {
      0: {
        flags: "Test flags",
        p0: {
          type: "Integer",
          description: "Test param",
          codeSample: {
            code: "test code",
            fileName: "test.c",
            lineNumber: 100,
          },
        },
        p1: "Unused",
        p2: "Unused",
        p3: "Unused",
      },
    };

    const names: Record<number, string> = {
      0: "TestItem",
    };

    const citations = extractCitationsFromParams(params, names);

    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      itemType: 0,
      itemName: "TestItem",
      paramName: "p0",
      citation: {
        code: "test code",
        fileName: "test.c",
        lineNumber: 100,
      },
    });
  });

  it("should extract citations from Bit Flags parameters", () => {
    const params: Record<number, ItemParams> = {
      1: {
        flags: "Test flags",
        p0: "Unused",
        p1: "Unused",
        p2: "Unused",
        p3: {
          type: "Bit Flags",
          flags: [
            {
              index: 0,
              description: "Flag 0",
              codeSample: {
                code: "flag 0 code",
                fileName: "flags.c",
                lineNumber: 50,
              },
            },
            {
              index: 1,
              description: "Flag 1",
              codeSample: {
                code: "flag 1 code",
                fileName: "flags.c",
                lineNumber: 55,
              },
            },
          ],
        },
      },
    };

    const names: Record<number, string> = {
      1: "FlagItem",
    };

    const citations = extractCitationsFromParams(params, names);

    expect(citations).toHaveLength(2);
    expect(citations[0]?.flagIndex).toBe(0);
    expect(citations[1]?.flagIndex).toBe(1);
  });

  it("should skip Unused and Unknown parameters", () => {
    const params: Record<number, ItemParams> = {
      2: {
        flags: "Test",
        p0: "Unused",
        p1: "Unknown",
        p2: "Unused",
        p3: "Unknown",
      },
    };

    const names: Record<number, string> = {
      2: "EmptyItem",
    };

    const citations = extractCitationsFromParams(params, names);

    expect(citations).toHaveLength(0);
  });

  it("should handle multiple items", () => {
    const params: Record<number, ItemParams> = {
      0: {
        flags: "Flags 0",
        p0: {
          type: "Integer",
          description: "Item 0 p0",
          codeSample: { code: "code0", fileName: "file0.c", lineNumber: 10 },
        },
        p1: "Unused",
        p2: "Unused",
        p3: "Unused",
      },
      1: {
        flags: "Flags 1",
        p0: {
          type: "Integer",
          description: "Item 1 p0",
          codeSample: { code: "code1", fileName: "file1.c", lineNumber: 20 },
        },
        p1: {
          type: "Integer",
          description: "Item 1 p1",
          codeSample: { code: "code2", fileName: "file1.c", lineNumber: 30 },
        },
        p2: "Unused",
        p3: "Unused",
      },
    };

    const names: Record<number, string> = {
      0: "Item0",
      1: "Item1",
    };

    const citations = extractCitationsFromParams(params, names);

    expect(citations).toHaveLength(3);
  });
});
