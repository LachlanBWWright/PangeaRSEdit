/**
 * Citation Verification Engine
 * 
 * Verifies that code citations in item parameter definitions match
 * the actual source code in the GitHub repositories.
 */

import { Result, ok, err } from "../types/result";
import { Citation, extractCitations, extractAllCitations } from "./citationExtractor";
import { GitHubFileCache } from "./githubFetcher";
import { GAME_REPOSITORIES } from "./gameRepositories";

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
  similarity?: number;  // 0-1 similarity score for partial matches
  message?: string;
}

/**
 * Normalize code for comparison
 * - Removes leading/trailing whitespace
 * - Normalizes multiple spaces to single space
 * - Removes C-style comments
 * - Trims line-by-line
 */
export function normalizeCode(code: string): string {
  return code
    // Remove C-style block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove C++ style line comments
    .replace(/\/\/.*$/gm, '')
    // Normalize whitespace
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const normalized1 = normalizeCode(str1);
  const normalized2 = normalizeCode(str2);
  
  if (normalized1 === normalized2) return 1;
  
  // Use a simplified similarity based on common substring ratio
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
  
  if (longer.length === 0) return 1;
  
  // Count matching characters (simplified approach)
  let matches = 0;
  const shorterChars = shorter.split('');
  const longerChars = longer.split('');
  
  for (const char of shorterChars) {
    const idx = longerChars.indexOf(char);
    if (idx !== -1) {
      matches++;
      longerChars.splice(idx, 1);
    }
  }
  
  return matches / longer.length;
}

/**
 * Compare citation code with actual source code
 */
export function compareCode(
  expected: string,
  actual: string,
): { match: boolean; similarity: number } {
  const normalizedExpected = normalizeCode(expected);
  const normalizedActual = normalizeCode(actual);
  
  // Exact match after normalization
  if (normalizedExpected === normalizedActual) {
    return { match: true, similarity: 1 };
  }
  
  // Check if expected is contained in actual (for multi-line snippets)
  if (normalizedActual.includes(normalizedExpected)) {
    return { match: true, similarity: 1 };
  }
  
  // Calculate similarity score
  const similarity = calculateSimilarity(normalizedExpected, normalizedActual);
  
  return { match: similarity >= 0.9, similarity };
}

/**
 * Search for code snippet in a file
 * Returns the line number where the code starts (1-indexed)
 */
export function findCodeInFile(
  code: string,
  fileLines: string[],
): { lineNumber: number; exactMatch: boolean } | null {
  const normalizedCode = normalizeCode(code);
  const codeLines = normalizedCode.split('\n').filter(line => line.length > 0);
  
  if (codeLines.length === 0) return null;
  
  const firstCodeLine = codeLines[0];
  
  // Search for match
  for (let i = 0; i < fileLines.length; i++) {
    const normalizedFileLine = normalizeCode(fileLines[i]);
    
    // Skip empty lines in the file
    if (normalizedFileLine.length === 0) continue;
    
    // Check if this line contains the first line of the code sample
    // Be stricter: require at least partial word match
    const isMatch = normalizedFileLine.includes(firstCodeLine) || 
                    firstCodeLine.includes(normalizedFileLine);
    
    if (!isMatch) continue;
    
    // For single-line samples, this is a match
    if (codeLines.length === 1) {
      return { lineNumber: i + 1, exactMatch: normalizedFileLine === firstCodeLine };
    }
    
    // For multi-line samples, check subsequent lines
    let allMatch = true;
    let fileLineIndex = i + 1;
    
    for (let j = 1; j < codeLines.length; j++) {
      const expectedLine = codeLines[j];
      
      // Skip empty file lines
      while (fileLineIndex < fileLines.length && normalizeCode(fileLines[fileLineIndex]).length === 0) {
        fileLineIndex++;
      }
      
      if (fileLineIndex >= fileLines.length) {
        allMatch = false;
        break;
      }
      
      const actualLine = normalizeCode(fileLines[fileLineIndex]);
      if (!actualLine.includes(expectedLine) && !expectedLine.includes(actualLine)) {
        allMatch = false;
        break;
      }
      fileLineIndex++;
    }
    
    if (allMatch) {
      return { lineNumber: i + 1, exactMatch: true };
    }
  }
  
  return null;
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
  const codeLineCount = citation.codeSample.code.split('\n').length;
  const startLine = citation.codeSample.lineNumber;
  const endLine = startLine + codeLineCount + 5; // Add some buffer
  
  // Fetch the file
  const fileResult = await cache.getGameFile(citation.game, citation.codeSample.fileName);
  
  if (!fileResult.ok) {
    const error = fileResult.error;
    if (error.message.includes('not found')) {
      return {
        citation,
        status: VerificationStatus.FILE_NOT_FOUND,
        message: `File not found: ${citation.codeSample.fileName}`,
      };
    }
    return {
      citation,
      status: VerificationStatus.NETWORK_ERROR,
      message: error.message,
    };
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
  const actualCode = actualLines.join('\n');
  
  // Compare the code
  const comparison = compareCode(citation.codeSample.code, actualCode);
  
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
  const foundLocation = findCodeInFile(citation.codeSample.code, fileLines);
  
  if (foundLocation) {
    return {
      citation,
      status: VerificationStatus.PARTIAL_MATCH,
      actualCode: fileLines.slice(foundLocation.lineNumber - 1, foundLocation.lineNumber + codeLineCount).join('\n'),
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
    const result = await verifyCitation(citations[i], cache);
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
  byGame: Record<string, {
    total: number;
    verified: number;
    failures: number;
  }>;
}

/**
 * Summarize verification results
 */
export function summarizeResults(results: VerificationResult[]): VerificationSummary {
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
    // Update game-specific stats
    if (!summary.byGame[result.citation.game]) {
      summary.byGame[result.citation.game] = { total: 0, verified: 0, failures: 0 };
    }
    summary.byGame[result.citation.game].total++;
    
    switch (result.status) {
      case VerificationStatus.VERIFIED:
        summary.verified++;
        summary.byGame[result.citation.game].verified++;
        break;
      case VerificationStatus.PARTIAL_MATCH:
        summary.partialMatches++;
        summary.byGame[result.citation.game].failures++;
        break;
      case VerificationStatus.CODE_CHANGED:
        summary.codeChanged++;
        summary.byGame[result.citation.game].failures++;
        break;
      case VerificationStatus.FILE_NOT_FOUND:
        summary.fileNotFound++;
        summary.byGame[result.citation.game].failures++;
        break;
      case VerificationStatus.LINE_NOT_FOUND:
        summary.lineNotFound++;
        summary.byGame[result.citation.game].failures++;
        break;
      case VerificationStatus.NETWORK_ERROR:
        summary.networkErrors++;
        summary.byGame[result.citation.game].failures++;
        break;
      case VerificationStatus.NO_REPOSITORY:
        summary.noRepository++;
        summary.byGame[result.citation.game].failures++;
        break;
    }
  }
  
  return summary;
}

/**
 * Get failed verifications only
 */
export function getFailedVerifications(results: VerificationResult[]): VerificationResult[] {
  return results.filter(r => r.status !== VerificationStatus.VERIFIED);
}

/**
 * Get verifications by status
 */
export function getByStatus(
  results: VerificationResult[],
  status: VerificationStatus,
): VerificationResult[] {
  return results.filter(r => r.status === status);
}
