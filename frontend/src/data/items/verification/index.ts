/**
 * Citation Verification System
 * 
 * This module provides utilities for verifying that code citations in item parameter
 * descriptions accurately reference the original game source code on GitHub.
 * 
 * Usage:
 * 1. Use `extractCitationsFromParams` to gather citations from item parameters
 * 2. Use `fetchGitHubFile` to retrieve source files from GitHub
 * 3. Use `verifyCitation` to verify each citation against the fetched file
 * 
 * @module verification
 */

export type { 
  VerificationResult,
  GameVerificationConfig,
  VerificationSummary,
  ExtractedCitation,
  FetchedFile,
} from "./types";

export { GAME_VERIFICATION_CONFIGS } from "./gameConfigs";
export { fetchGitHubFile } from "./githubFetcher";
export { extractCitationsFromParams, getCitationsFromParam } from "./extractCitations";
export { verifyCitation } from "./citationVerifier";
