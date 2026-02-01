/**
 * Validation Module - Barrel Export
 * 
 * Provides unified access to validation functionality including:
 * - Citation extraction and verification
 * - GitHub content fetching
 * - Report generation
 * - Level data validation
 */

// Citation extraction
export {
  type Citation,
  type CodeSample,
  extractCitations,
  extractAllCitations,
  getGamesWithItemParams,
  getCitationCount,
  getAllCitationCounts,
} from "./citationExtractor";

// Game repository mapping
export {
  type GameRepository,
  GAME_REPOSITORIES,
  getGitHubRawUrl,
  getGitHubPermalink,
  hasKnownRepository,
  getKnownGames,
} from "./gameRepositories";

// GitHub content fetching
export {
  type FetchResult,
  type RateLimitConfig,
  DEFAULT_RATE_LIMIT,
  fetchGitHubFile,
  fetchGameSourceFile,
  fetchFileLines,
  GitHubFileCache,
  createGitHubViewUrl,
} from "./githubFetcher";

// Citation verification
export {
  VerificationStatus,
  type VerificationResult,
  type VerificationSummary,
  normalizeCode,
  calculateSimilarity,
  compareCode,
  findCodeInFile,
  verifyCitation,
  verifyGameCitations,
  verifyAllCitations,
  summarizeResults,
  getFailedVerifications,
  getByStatus,
} from "./citationVerifier";

// Report generation
export {
  type VerificationReport,
  type CitationFix,
  generateReport,
  generateMarkdownReport,
  generateJsonReport,
  generateTextReport,
  suggestFixes,
} from "./reportGenerator";

// Level data schemas and validation
export {
  type FieldValidation,
  type SectionValidation,
  type LevelDataSchema,
  type ValidationError,
  type ValidationResult,
  validateLevelData,
  getSchemaForGame,
  OTTO_MATIC_SCHEMA,
  BUGDOM_2_SCHEMA,
  BUGDOM_SCHEMA,
  NANOSAUR_2_SCHEMA,
  BILLY_FRONTIER_SCHEMA,
  CRO_MAG_SCHEMA,
} from "./levelDataSchemas";
