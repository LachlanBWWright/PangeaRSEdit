export function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const normalized1 = normalizeCode(str1);
  const normalized2 = normalizeCode(str2);
  if (normalized1 === normalized2) return 1;

  const longer =
    normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter =
    normalized1.length > normalized2.length ? normalized2 : normalized1;
  if (longer.length === 0) return 1;

  let matches = 0;
  const longerChars = longer.split("");
  for (const char of shorter.split("")) {
    const idx = longerChars.indexOf(char);
    if (idx === -1) continue;
    matches++;
    longerChars.splice(idx, 1);
  }

  return matches / longer.length;
}

export function compareCode(
  expected: string,
  actual: string,
): { match: boolean; similarity: number } {
  const normalizedExpected = normalizeCode(expected);
  const normalizedActual = normalizeCode(actual);
  if (
    normalizedExpected === normalizedActual ||
    normalizedActual.includes(normalizedExpected)
  ) {
    return { match: true, similarity: 1 };
  }
  const similarity = calculateSimilarity(normalizedExpected, normalizedActual);
  return { match: similarity >= 0.9, similarity };
}

export function findCodeInFile(
  code: string,
  fileLines: string[],
): { lineNumber: number; exactMatch: boolean } | null {
  const normalizedCode = normalizeCode(code);
  const codeLines = normalizedCode
    .split("\n")
    .filter((line) => line.length > 0);
  if (codeLines.length === 0) return null;

  const firstCodeLine = codeLines[0] ?? "";
  for (let i = 0; i < fileLines.length; i++) {
    const fileLine = fileLines[i];
    if (fileLine === undefined) continue;
    const normalizedFileLine = normalizeCode(fileLine);
    if (normalizedFileLine.length === 0) continue;
    const isMatch =
      normalizedFileLine.includes(firstCodeLine) ||
      firstCodeLine.includes(normalizedFileLine);
    if (!isMatch) continue;
    if (codeLines.length === 1)
      return {
        lineNumber: i + 1,
        exactMatch: normalizedFileLine === firstCodeLine,
      };

    let allMatch = true;
    let fileLineIndex = i + 1;
    for (let j = 1; j < codeLines.length; j++) {
      const expectedLine = codeLines[j] ?? "";
      while (fileLineIndex < fileLines.length) {
        const checkLine = fileLines[fileLineIndex];
        if (checkLine !== undefined && normalizeCode(checkLine).length > 0)
          break;
        fileLineIndex++;
      }
      if (fileLineIndex >= fileLines.length) {
        allMatch = false;
        break;
      }
      const actualFileLine = fileLines[fileLineIndex];
      if (actualFileLine === undefined) {
        allMatch = false;
        break;
      }
      const actualLine = normalizeCode(actualFileLine);
      if (
        !actualLine.includes(expectedLine) &&
        !expectedLine.includes(actualLine)
      ) {
        allMatch = false;
        break;
      }
      fileLineIndex++;
    }

    if (allMatch) return { lineNumber: i + 1, exactMatch: true };
  }

  return null;
}
