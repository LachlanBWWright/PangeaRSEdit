import type { CodeSample } from "../itemParams";

/**
 * Result of verifying a single citation
 */
export interface VerificationResult {
  itemType: number;
  itemName: string;
  paramName: "flags" | "p0" | "p1" | "p2" | "p3";
  flagIndex?: number;
  citation: CodeSample;
  status: "verified" | "mismatch" | "not_found" | "error";
  actualContent?: string;
  errorMessage?: string;
  lineContext?: {
    before: string[];
    actual: string;
    after: string[];
  };
}

/**
 * Configuration for verifying a specific game's citations
 */
export interface GameVerificationConfig {
  game: string;
  repoOwner: string;
  repoName: string;
  basePath: string;
  branch: string;
}

/**
 * Summary of verification results for a game
 */
export interface VerificationSummary {
  game: string;
  total: number;
  verified: number;
  mismatches: number;
  notFound: number;
  errors: number;
  results: VerificationResult[];
}

/**
 * Extracted citation from item parameters
 */
export interface ExtractedCitation {
  itemType: number;
  itemName: string;
  paramName: "flags" | "p0" | "p1" | "p2" | "p3";
  flagIndex?: number;
  citation: CodeSample;
}

/**
 * Fetched file content from GitHub
 */
export interface FetchedFile {
  content: string;
  lines: string[];
  path: string;
}
