/**
 * Tests for citation verification logic
 */

import { describe, it, expect } from "vitest";
import { verifyCitation } from "@/data/items/verification/citationVerifier";
import type { FetchedFile } from "@/data/items/verification/types";
import type { CodeSample } from "@/data/items/itemParams";

describe("verifyCitation", () => {
  const createMockFile = (lines: string[]): FetchedFile => ({
    content: lines.join("\n"),
    lines,
    path: "test.c",
  });

  it("should verify exact match", () => {
    const file = createMockFile([
      "line 1",
      "int type = itemPtr->parm[0];",
      "line 3",
    ]);

    const citation: CodeSample = {
      code: "int type = itemPtr->parm[0];",
      fileName: "test.c",
      lineNumber: 2,
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("verified");
    expect(result.actualContent).toBe("int type = itemPtr->parm[0];");
  });

  it("should verify partial match", () => {
    const file = createMockFile([
      "line 1",
      "    int type = itemPtr->parm[0]; // get type",
      "line 3",
    ]);

    const citation: CodeSample = {
      code: "int type = itemPtr->parm[0];",
      fileName: "test.c",
      lineNumber: 2,
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("verified");
  });

  it("should detect line not found", () => {
    const file = createMockFile(["line 1", "line 2"]);

    const citation: CodeSample = {
      code: "some code",
      fileName: "test.c",
      lineNumber: 10, // Beyond file length
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("not_found");
    expect(result.errorMessage).toContain("does not exist");
  });

  it("should detect mismatch and find nearby", () => {
    const file = createMockFile([
      "line 1",
      "wrong code here",
      "line 3",
      "int type = itemPtr->parm[0];", // Actual code is at line 4
      "line 5",
    ]);

    const citation: CodeSample = {
      code: "int type = itemPtr->parm[0];",
      fileName: "test.c",
      lineNumber: 2, // But we claim it's at line 2
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("mismatch");
    expect(result.errorMessage).toContain("found at line 4");
  });

  it("should detect mismatch with no nearby match", () => {
    const file = createMockFile([
      "line 1",
      "completely different code",
      "line 3",
    ]);

    const citation: CodeSample = {
      code: "int type = itemPtr->parm[0];",
      fileName: "test.c",
      lineNumber: 2,
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("mismatch");
    expect(result.actualContent).toBe("completely different code");
  });

  it("should provide line context", () => {
    const file = createMockFile([
      "before 1",
      "before 2",
      "target line",
      "after 1",
      "after 2",
    ]);

    const citation: CodeSample = {
      code: "target line",
      fileName: "test.c",
      lineNumber: 3,
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("verified");
    expect(result.lineContext?.before).toEqual(["before 1", "before 2"]);
    expect(result.lineContext?.actual).toBe("target line");
    expect(result.lineContext?.after).toEqual(["after 1", "after 2"]);
  });

  it("should handle whitespace differences", () => {
    const file = createMockFile([
      "    int   type = itemPtr->parm[0];  ",
    ]);

    const citation: CodeSample = {
      code: "int type = itemPtr->parm[0];",
      fileName: "test.c",
      lineNumber: 1,
    };

    const result = verifyCitation(file, citation, 0, "TestItem", "p0");

    expect(result.status).toBe("verified");
  });

  it("should include flagIndex in result", () => {
    const file = createMockFile([
      "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
    ]);

    const citation: CodeSample = {
      code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
      fileName: "test.c",
      lineNumber: 1,
    };

    const result = verifyCitation(file, citation, 5, "Enemy", "p3", 1);

    expect(result.status).toBe("verified");
    expect(result.flagIndex).toBe(1);
    expect(result.paramName).toBe("p3");
  });
});
