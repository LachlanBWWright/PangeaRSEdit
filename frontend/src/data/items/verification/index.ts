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
