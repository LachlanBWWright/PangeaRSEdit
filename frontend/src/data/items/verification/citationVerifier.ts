import type { CodeSample } from "../itemParams";
import type { VerificationResult, FetchedFile } from "./types";

/**
 * Verify a citation against fetched file content
 */
export function verifyCitation(
  file: FetchedFile,
  citation: CodeSample,
  itemType: number,
  itemName: string,
  paramName: "flags" | "p0" | "p1" | "p2" | "p3",
  flagIndex?: number,
  fuzzyMatch: boolean = true,
): VerificationResult {
  const lineIndex = citation.lineNumber - 1; // 0-indexed

  // Get actual line content
  const actualLine = file.lines[lineIndex];
  if (actualLine === undefined) {
    return {
      itemType,
      itemName,
      paramName,
      flagIndex,
      citation,
      status: "not_found",
      errorMessage: `Line ${citation.lineNumber} does not exist (file has ${file.lines.length} lines)`,
    };
  }

  // Normalize both strings for comparison
  const normalizedCitation = normalizeLine(citation.code);
  const normalizedActual = normalizeLine(actualLine);

  // Check for exact or fuzzy match
  if (
    normalizedActual.includes(normalizedCitation) ||
    (fuzzyMatch && fuzzyLineMatch(normalizedCitation, normalizedActual))
  ) {
    return {
      itemType,
      itemName,
      paramName,
      flagIndex,
      citation,
      status: "verified",
      actualContent: actualLine,
      lineContext: getLineContext(file.lines, lineIndex),
    };
  }

  // Search nearby lines (±10 lines)
  const nearbyMatch = findNearbyMatch(file.lines, citation.code, lineIndex, 10);
  if (nearbyMatch) {
    return {
      itemType,
      itemName,
      paramName,
      flagIndex,
      citation,
      status: "mismatch",
      errorMessage: `Code found at line ${nearbyMatch.line} instead of ${citation.lineNumber}`,
      actualContent: nearbyMatch.content,
    };
  }

  return {
    itemType,
    itemName,
    paramName,
    flagIndex,
    citation,
    status: "mismatch",
    actualContent: actualLine,
    errorMessage: `Expected code not found at line ${citation.lineNumber}`,
    lineContext: getLineContext(file.lines, lineIndex),
  };
}

/**
 * Normalize a line by removing extra whitespace
 */
function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/**
 * Fuzzy match that ignores comments
 */
function fuzzyLineMatch(expected: string, actual: string): boolean {
  // Remove C/C++ comments
  const cleanExpected = expected
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "");
  const cleanActual = actual
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "");
  return normalizeLine(cleanActual).includes(normalizeLine(cleanExpected));
}

/**
 * Get context lines around a specific line
 */
function getLineContext(
  lines: string[],
  index: number,
  context: number = 2,
): { before: string[]; actual: string; after: string[] } {
  return {
    before: lines.slice(Math.max(0, index - context), index),
    actual: lines[index] ?? "",
    after: lines.slice(index + 1, index + context + 1),
  };
}

/**
 * Find code in nearby lines
 */
function findNearbyMatch(
  lines: string[],
  code: string,
  centerIndex: number,
  range: number,
): { line: number; content: string } | null {
  const normalizedCode = normalizeLine(code);

  // Search first line of multi-line code samples
  const firstLine = normalizedCode.split("\n")[0] ?? normalizedCode;

  for (let offset = 1; offset <= range; offset++) {
    for (const index of [centerIndex - offset, centerIndex + offset]) {
      if (index < 0 || index >= lines.length) continue;
      const line = lines[index];
      if (line && normalizeLine(line).includes(firstLine)) {
        return { line: index + 1, content: line };
      }
    }
  }
  return null;
}
