/**
 * Citation Verification Engine
 *
 * Verifies that code citations in item parameter definitions match
 * the actual source code in the GitHub repositories.
 */

import { extractCitations, extractAllCitations } from "./citationExtractor";
import type { Citation } from "./citationExtractor";
import { GitHubFileCache } from "./githubFetcher";
import { GAME_REPOSITORIES } from "./gameRepositories";
import { compareCode, findCodeInFile } from "./citationVerifierUtils";
export {
  normalizeCode,
  calculateSimilarity,
  compareCode,
  findCodeInFile,
} from "./citationVerifierUtils";

/**
 * Verification status enum
 */
export enum VerificationStatus {
  /** Code matches exactly at the specified line */
  VERIFIED = "verified",
  /** Code exists but at a different line number */
  PARTIAL_MATCH = "partial_match",
  /** Line exists but code is different */
  CODE_CHANGED = "code_changed",
  /** Line number is out of range for the file */
  LINE_NOT_FOUND = "line_not_found",
  /** File doesn't exist in the repository */
  FILE_NOT_FOUND = "file_not_found",
  /** Network error during fetch */
  NETWORK_ERROR = "network_error",
  /** Game doesn't have a known repository */
  NO_REPOSITORY = "no_repository",
}

/**
 * Result of verifying a single citation
 */
export interface VerificationResult {
  citation: Citation;
  status: VerificationStatus;
  actualCode?: string;
  actualLineNumber?: number;
  similarity?: number; // 0-1 similarity score for partial matches
  message?: string;
}

function createFetchErrorResult(
  citation: Citation,
  error: Error,
): VerificationResult {
  if (error.message.includes("not found")) {
    return {
      citation,
      status: VerificationStatus.FILE_NOT_FOUND,
      message: `File not found: ${citation.citation.fileName}`,
    };
  }
  return {
    citation,
    status: VerificationStatus.NETWORK_ERROR,
    message: error.message,
  };
}

function applyStatusToSummary(
  summary: VerificationSummary,
  gameStats: { total: number; verified: number; failures: number },
  status: VerificationStatus,
): void {
  if (status === VerificationStatus.VERIFIED) {
    summary.verified++;
    gameStats.verified++;
    return;
  }
  gameStats.failures++;
  if (status === VerificationStatus.PARTIAL_MATCH) summary.partialMatches++;
  else if (status === VerificationStatus.CODE_CHANGED) summary.codeChanged++;
  else if (status === VerificationStatus.FILE_NOT_FOUND) summary.fileNotFound++;
  else if (status === VerificationStatus.LINE_NOT_FOUND) summary.lineNotFound++;
  else if (status === VerificationStatus.NETWORK_ERROR) summary.networkErrors++;
  else if (status === VerificationStatus.NO_REPOSITORY) summary.noRepository++;
}

/**
 * Verify a single citation against GitHub source
 */
export async function verifyCitation(
  citation: Citation,
  cache: GitHubFileCache,
): Promise<VerificationResult> {
  // Check if game has a known repository
  if (!GAME_REPOSITORIES[citation.game]) {
    return {
      citation,
      status: VerificationStatus.NO_REPOSITORY,
      message: `No known repository for game: ${citation.game}`,
    };
  }

  // Calculate the end line (estimate based on code length)
  const codeLineCount = citation.citation.code.split("\n").length;
  const startLine = citation.citation.lineNumber;
  const endLine = startLine + codeLineCount + 5; // Add some buffer

  // Fetch the file
  const fileResult = await cache.getGameFile(
    citation.game,
    citation.citation.fileName,
  );

  if (fileResult.isErr()) {
    return createFetchErrorResult(citation, fileResult.error);
  }

  const { lines: fileLines, totalLines } = fileResult.value;

  // Check if line number is valid
  if (startLine > totalLines) {
    return {
      citation,
      status: VerificationStatus.LINE_NOT_FOUND,
      message: `Line ${startLine} exceeds file length ${totalLines}`,
    };
  }

  // Get the actual code at the specified line
  const actualEndLine = Math.min(endLine, totalLines);
  const actualLines = fileLines.slice(startLine - 1, actualEndLine);
  const actualCode = actualLines.join("\n");

  // Compare the code
  const comparison = compareCode(citation.citation.code, actualCode);

  if (comparison.match) {
    return {
      citation,
      status: VerificationStatus.VERIFIED,
      actualCode,
      actualLineNumber: startLine,
      similarity: comparison.similarity,
    };
  }

  // Code doesn't match - search the entire file
  const foundLocation = findCodeInFile(citation.citation.code, fileLines);

  if (foundLocation) {
    return {
      citation,
      status: VerificationStatus.PARTIAL_MATCH,
      actualCode: fileLines
        .slice(
          foundLocation.lineNumber - 1,
          foundLocation.lineNumber + codeLineCount,
        )
        .join("\n"),
      actualLineNumber: foundLocation.lineNumber,
      similarity: foundLocation.exactMatch ? 1 : comparison.similarity,
      message: `Code found at line ${foundLocation.lineNumber} instead of ${startLine}`,
    };
  }

  // Code not found anywhere
  return {
    citation,
    status: VerificationStatus.CODE_CHANGED,
    actualCode,
    similarity: comparison.similarity,
    message: `Code at line ${startLine} has changed (similarity: ${(comparison.similarity * 100).toFixed(1)}%)`,
  };
}

/**
 * Verify all citations for a game
 */
export async function verifyGameCitations(
  game: string,
  cache: GitHubFileCache,
  progressCallback?: (current: number, total: number) => void,
): Promise<VerificationResult[]> {
  const citations = extractCitations(game);
  const results: VerificationResult[] = [];

  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];
    if (!citation) continue;

    const result = await verifyCitation(citation, cache);
    results.push(result);

    if (progressCallback) {
      progressCallback(i + 1, citations.length);
    }
  }

  return results;
}

/**
 * Verify all citations across all games
 */
export async function verifyAllCitations(
  cache: GitHubFileCache,
  progressCallback?: (current: number, total: number, game: string) => void,
): Promise<VerificationResult[]> {
  const allCitations = extractAllCitations();
  const results: VerificationResult[] = [];

  let currentIndex = 0;
  for (const citation of allCitations) {
    const result = await verifyCitation(citation, cache);
    results.push(result);
    currentIndex++;

    if (progressCallback) {
      progressCallback(currentIndex, allCitations.length, citation.game);
    }
  }

  return results;
}

/**
 * Summary of verification results
 */
export interface VerificationSummary {
  total: number;
  verified: number;
  partialMatches: number;
  codeChanged: number;
  fileNotFound: number;
  lineNotFound: number;
  networkErrors: number;
  noRepository: number;
  byGame: Record<
    string,
    {
      total: number;
      verified: number;
      failures: number;
    }
  >;
}

/**
 * Summarize verification results
 */
export function summarizeResults(
  results: VerificationResult[],
): VerificationSummary {
  const summary: VerificationSummary = {
    total: results.length,
    verified: 0,
    partialMatches: 0,
    codeChanged: 0,
    fileNotFound: 0,
    lineNotFound: 0,
    networkErrors: 0,
    noRepository: 0,
    byGame: {},
  };

  for (const result of results) {
    const game = result.citation.game;
    // Update game-specific stats
    let gameStats = summary.byGame[game];
    if (!gameStats) {
      gameStats = { total: 0, verified: 0, failures: 0 };
      summary.byGame[game] = gameStats;
    }
    gameStats.total++;

    applyStatusToSummary(summary, gameStats, result.status);
  }

  return summary;
}

/**
 * Get failed verifications only
 */
export function getFailedVerifications(
  results: VerificationResult[],
): VerificationResult[] {
  return results.filter((r) => r.status !== VerificationStatus.VERIFIED);
}

/**
 * Get verifications by status
 */
export function getByStatus(
  results: VerificationResult[],
  status: VerificationStatus,
): VerificationResult[] {
  return results.filter((r) => r.status === status);
}
