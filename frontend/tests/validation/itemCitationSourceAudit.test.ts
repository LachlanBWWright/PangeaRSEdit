import { describe, expect, it } from "vitest";
import {
  citationMatchesSourceLine,
  extractTerrainDispatch,
  extractTerrainItemFunctions,
} from "../../scripts/dev/audit-item-citations";

describe("item citation source audit", () => {
  it("maps terrain add routines to their numeric item types", () => {
    const dispatch = extractTerrainDispatch(`
      static Boolean (*gTerrainItemAddRoutines[])(TerrainItemEntryType*) =
      {
        NilAdd,
        AddTree,
        AddShared,
        AddShared,
      };
    `);

    expect(dispatch.get("NilAdd")).toEqual([0]);
    expect(dispatch.get("AddTree")).toEqual([1]);
    expect(dispatch.get("AddShared")).toEqual([2, 3]);
  });

  it("finds parameter indexes and exact function line ranges", () => {
    const functions = extractTerrainItemFunctions(
      "Items/Items.c",
      [
        "static Boolean AddTree(TerrainItemEntryType *itemPtr, float x, float z)",
        "{",
        "  const int type = itemPtr->parm[0];",
        "  if (itemPtr -> parm [ 3 ] & 1)",
        "  {",
        "    return true;",
        "  }",
        "  return false;",
        "}",
      ].join("\n"),
    );

    expect(functions).toEqual([
      {
        fileName: "Items/Items.c",
        name: "AddTree",
        startLine: 1,
        endLine: 9,
        paramIndexes: [0, 3],
        calledFunctions: [],
      },
    ]);
  });

  it("ignores comments and unrelated parameter arrays", () => {
    const functions = extractTerrainItemFunctions(
      "Items/Items.c",
      [
        "Boolean AddTree(TerrainItemEntryType *itemPtr, float x, float z)",
        "{",
        "  // itemPtr->parm[2] is historical",
        "  return params[1] != 0;",
        "}",
      ].join("\n"),
    );

    expect(functions).toEqual([]);
  });

  it("records helper calls that forward the terrain item", () => {
    const functions = extractTerrainItemFunctions(
      "Items/Items.c",
      [
        "Boolean AddTree(TerrainItemEntryType *itemPtr, float x, float z)",
        "{",
        "  return MakeTree(x, z, itemPtr);",
        "}",
      ].join("\n"),
    );

    expect(functions[0]?.calledFunctions).toEqual(["MakeTree"]);
  });

  it("requires the cited range itself to contain the parameter", () => {
    const citation = {
      label: "Tree type",
      url: "https://example.test/source#L2",
      fileName: "Items/Items.c",
      lineNumber: 2,
      code: "itemPtr->parm[0]",
    };
    const source = [
      "itemPtr->parm[0];",
      "itemPtr->parm[1];",
    ].join("\n");

    expect(citationMatchesSourceLine(citation, source, 0)).toBe(false);
    expect(citationMatchesSourceLine(citation, source, 1)).toBe(false);
    expect(
      citationMatchesSourceLine(
        { ...citation, code: "itemPtr -> parm [ 1 ];" },
        source,
        1,
      ),
    ).toBe(true);
    expect(
      citationMatchesSourceLine({ ...citation, code: "" }, source, 1),
    ).toBe(false);
  });
});
