# Item Parameter Citation Verification System

## Overview

This plan describes a system for verifying the accuracy of item parameter descriptions by fetching the cited source code from GitHub and comparing it against the documented code snippets.

## Problem Statement

The codebase contains detailed documentation for item parameters in files like:
- `frontend/src/data/items/ottoItemType.ts`
- `frontend/src/data/items/bugdom2ItemType.ts`
- `frontend/src/data/items/billyFrontierItemType.ts`
- `frontend/src/data/splines/*SplineItemType.ts`

Each parameter description includes a `CodeSample` object with:
```typescript
interface CodeSample {
  code: string;       // The actual code snippet
  fileName: string;   // Source file name (e.g., "Items/Items.c")
  lineNumber: number; // Starting line number
}
```

These citations reference the original Pangea game source code repositories. Over time, as the source code evolves or is better understood, these citations may become outdated or inaccurate.

## Goals

1. Create automated tests that verify citation accuracy
2. Define standard types for commonly repeated parameter patterns (rotation, scale, etc.)
3. Generate reports of outdated/inaccurate citations
4. Provide tooling for updating citations

---

## Phase 1: Citation Data Extraction

### 1.1 Create Citation Extractor

**File:** `frontend/src/validation/citationExtractor.ts`

```typescript
export interface Citation {
  game: string;              // "ottomatic", "bugdom2", etc.
  itemType: string;          // Item type name
  parameterName: string;     // "p0", "p1", "p2", "p3", or "flags"
  codeSample: CodeSample;
  sourceFile: string;        // Full path in this codebase
}

export interface CodeSample {
  code: string;
  fileName: string;
  lineNumber: number;
}

/**
 * Extract all citations from a game's item type definitions
 */
export function extractCitations(game: string): Citation[];

/**
 * Extract all citations across all games
 */
export function extractAllCitations(): Citation[];
```

### 1.2 Game Source Repository Mapping

Create a mapping from game names to their GitHub repositories:

**File:** `frontend/src/validation/gameRepositories.ts`

```typescript
export interface GameRepository {
  owner: string;
  repo: string;
  branch: string;
  sourcePath: string;  // Path to Source directory
}

export const GAME_REPOSITORIES: Record<string, GameRepository> = {
  ottomatic: {
    owner: "jorio",
    repo: "OttoMatic",
    branch: "master",
    sourcePath: "src",
  },
  bugdom2: {
    owner: "jorio", 
    repo: "Bugdom2",
    branch: "master",
    sourcePath: "src",
  },
  bugdom: {
    owner: "jorio",
    repo: "Bugdom",
    branch: "master",
    sourcePath: "src",
  },
  nanosaur: {
    owner: "jorio",
    repo: "Nanosaur",
    branch: "master",
    sourcePath: "src",
  },
  nanosaur2: {
    owner: "jorio",
    repo: "Nanosaur2",
    branch: "master",
    sourcePath: "src",
  },
  cromagrally: {
    owner: "jorio",
    repo: "CroMagRally",
    branch: "master",
    sourcePath: "src",
  },
  billyfrontier: {
    owner: "jorio",
    repo: "BillyFrontier",
    branch: "master",
    sourcePath: "src",
  },
};
```

---

## Phase 2: GitHub Content Fetcher

### 2.1 Create GitHub API Client

**File:** `frontend/src/validation/githubFetcher.ts`

```typescript
export interface FetchResult {
  success: boolean;
  content?: string;
  lines?: string[];
  error?: string;
}

/**
 * Fetch a file from a GitHub repository
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<FetchResult>;

/**
 * Get specific lines from a file
 */
export async function fetchFileLines(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  startLine: number,
  endLine: number,
): Promise<FetchResult>;

/**
 * Cache fetched files to avoid rate limiting
 */
export class GitHubFileCache {
  private cache: Map<string, string>;
  
  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<FetchResult>;
  
  clearCache(): void;
}
```

### 2.2 Rate Limiting and Error Handling

```typescript
export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  retryDelay: number;
  maxRetries: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerMinute: 60,
  retryDelay: 1000,
  maxRetries: 3,
};
```

---

## Phase 3: Citation Verification Engine

### 3.1 Create Verification Logic

**File:** `frontend/src/validation/citationVerifier.ts`

```typescript
export enum VerificationStatus {
  VERIFIED = "verified",           // Code matches exactly
  PARTIAL_MATCH = "partial_match", // Code exists but different line
  CODE_CHANGED = "code_changed",   // Line exists but code differs
  LINE_NOT_FOUND = "line_not_found", // Line number out of range
  FILE_NOT_FOUND = "file_not_found", // File doesn't exist
  NETWORK_ERROR = "network_error",  // Failed to fetch
}

export interface VerificationResult {
  citation: Citation;
  status: VerificationStatus;
  actualCode?: string;
  actualLineNumber?: number;
  similarity?: number;  // 0-1 similarity score for partial matches
  message?: string;
}

/**
 * Verify a single citation against GitHub source
 */
export async function verifyCitation(
  citation: Citation,
  cache: GitHubFileCache,
): Promise<VerificationResult>;

/**
 * Verify all citations for a game
 */
export async function verifyGameCitations(
  game: string,
  cache: GitHubFileCache,
): Promise<VerificationResult[]>;

/**
 * Verify all citations across all games
 */
export async function verifyAllCitations(
  cache: GitHubFileCache,
  progressCallback?: (progress: number, total: number) => void,
): Promise<VerificationResult[]>;
```

### 3.2 Code Matching Algorithm

```typescript
/**
 * Compare citation code with actual source code
 * Returns similarity score 0-1
 */
export function compareCode(
  expected: string,
  actual: string,
): { match: boolean; similarity: number };

/**
 * Search for code snippet in a file
 * Returns line number if found, null if not
 */
export function findCodeInFile(
  code: string,
  fileContent: string,
): { lineNumber: number; exactMatch: boolean } | null;

/**
 * Normalize code for comparison (remove whitespace, comments, etc.)
 */
export function normalizeCode(code: string): string;
```

---

## Phase 4: Testing Infrastructure

### 4.1 Vitest Test Suite

**File:** `frontend/tests/validation/citationVerification.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { 
  extractAllCitations,
  verifyAllCitations,
  GitHubFileCache,
  VerificationStatus,
} from "@/validation";

describe("Citation Verification", () => {
  let cache: GitHubFileCache;
  
  beforeAll(() => {
    cache = new GitHubFileCache();
  });
  
  describe("Otto Matic Citations", () => {
    it("should verify all Otto Matic item parameter citations", async () => {
      const results = await verifyGameCitations("ottomatic", cache);
      const failures = results.filter(
        r => r.status !== VerificationStatus.VERIFIED
      );
      
      if (failures.length > 0) {
        console.log("Failed citations:", failures);
      }
      
      expect(failures.length).toBe(0);
    }, 60000); // Longer timeout for network requests
  });
  
  // Similar tests for other games...
});
```

### 4.2 CLI Verification Tool

**File:** `frontend/scripts/verifyCitations.ts`

```typescript
#!/usr/bin/env npx ts-node

/**
 * CLI tool to verify citations
 * Usage: npx ts-node scripts/verifyCitations.ts [game]
 */

async function main() {
  const game = process.argv[2];
  const results = game 
    ? await verifyGameCitations(game, new GitHubFileCache())
    : await verifyAllCitations(new GitHubFileCache());
  
  // Generate report
  const report = generateReport(results);
  console.log(report);
  
  // Exit with error if any failures
  const failures = results.filter(
    r => r.status !== VerificationStatus.VERIFIED
  );
  process.exit(failures.length > 0 ? 1 : 0);
}
```

### 4.3 GitHub Actions Integration

**File:** `.github/workflows/verify-citations.yml`

```yaml
name: Verify Citations

on:
  push:
    paths:
      - 'frontend/src/data/items/**'
      - 'frontend/src/data/splines/**'
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sundays
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run verify-citations
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Phase 5: Standard Parameter Types

### 5.1 Define Common Parameter Types

**File:** `frontend/src/data/items/standardParamTypes.ts`

```typescript
/**
 * Standard parameter type definitions for commonly repeated patterns
 */

export interface RotationParam {
  type: "Rotation";
  divisions: number;  // e.g., 4 for PI/2, 8 for PI2/8
  multiplier: string; // "PI/2", "PI2/4", etc.
}

export interface ScaleParam {
  type: "Scale";
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

export interface TypeSelectorParam {
  type: "TypeSelector";
  options: Record<number, string>;
}

export interface BitFlagsParam {
  type: "BitFlags";
  flags: {
    index: number;
    name: string;
    description: string;
  }[];
}

export interface IdParam {
  type: "Id";
  description: string;
  maxValue?: number;
}

export interface CountParam {
  type: "Count";
  description: string;
  minValue?: number;
  maxValue?: number;
}

export type StandardParamType = 
  | RotationParam
  | ScaleParam
  | TypeSelectorParam
  | BitFlagsParam
  | IdParam
  | CountParam;

/**
 * Pre-defined standard rotation parameters
 */
export const ROTATION_4_WAY: RotationParam = {
  type: "Rotation",
  divisions: 4,
  multiplier: "PI/2",
};

export const ROTATION_8_WAY: RotationParam = {
  type: "Rotation",
  divisions: 8,
  multiplier: "PI2/8",
};

export const ROTATION_16_WAY: RotationParam = {
  type: "Rotation",
  divisions: 16,
  multiplier: "PI2/16",
};

/**
 * Common enemy flags pattern
 */
export const ENEMY_SPAWN_FLAGS: BitFlagsParam = {
  type: "BitFlags",
  flags: [
    { index: 0, name: "AlwaysAdd", description: "Always add (ignore max limit)" },
    { index: 1, name: "Regenerate", description: "Enemy regenerates after death" },
  ],
};
```

### 5.2 Migrate Existing Params to Standard Types

Create utility to identify params that can use standard types:

```typescript
/**
 * Analyze existing params and suggest standardization
 */
export function analyzeParams(): {
  rotationParams: Citation[];
  scaleParams: Citation[];
  flagParams: Citation[];
  typeSelectors: Citation[];
};
```

---

## Phase 6: Reporting and Maintenance

### 6.1 Report Generation

**File:** `frontend/src/validation/reportGenerator.ts`

```typescript
export interface VerificationReport {
  timestamp: Date;
  totalCitations: number;
  verified: number;
  partialMatches: number;
  failures: number;
  byGame: Record<string, {
    total: number;
    verified: number;
    failures: VerificationResult[];
  }>;
  recommendations: string[];
}

export function generateReport(
  results: VerificationResult[],
): VerificationReport;

export function generateMarkdownReport(
  report: VerificationReport,
): string;

export function generateJsonReport(
  report: VerificationReport,
): string;
```

### 6.2 Citation Update Helper

```typescript
/**
 * Generate suggested fixes for failed citations
 */
export function suggestFixes(
  failures: VerificationResult[],
): {
  citation: Citation;
  suggestedCode: string;
  suggestedLineNumber: number;
}[];
```

---

## File Summary

### New Files to Create

```
frontend/src/validation/
├── index.ts                    # Export all validation utilities
├── citationExtractor.ts        # Extract citations from item types
├── gameRepositories.ts         # Game to GitHub repo mapping
├── githubFetcher.ts            # GitHub API client
├── citationVerifier.ts         # Core verification logic
├── reportGenerator.ts          # Report generation
└── standardParamTypes.ts       # Standard parameter type definitions

frontend/tests/validation/
└── citationVerification.test.ts # Verification tests

frontend/scripts/
└── verifyCitations.ts          # CLI verification tool

.github/workflows/
└── verify-citations.yml        # CI workflow
```

### Files to Modify

```
frontend/src/data/items/itemParams.ts
  - Add StandardParamType union type
  - Update ParamDescription to support standard types

frontend/package.json
  - Add "verify-citations" script
```

---

## Implementation Order

1. **Phase 1**: Citation data extraction (2 hours)
2. **Phase 2**: GitHub content fetcher with caching (3 hours)
3. **Phase 3**: Citation verification engine (4 hours)
4. **Phase 4**: Testing infrastructure (2 hours)
5. **Phase 5**: Standard parameter types (2 hours)
6. **Phase 6**: Reporting and maintenance tools (2 hours)

**Total estimated effort**: 15 hours

---

## Testing Strategy

1. **Unit tests** for each utility function
2. **Integration tests** with mock GitHub responses
3. **End-to-end tests** with real GitHub API (rate-limited)
4. **Snapshot tests** for report generation

---

## Risk Assessment

### High Risk
- GitHub API rate limiting (mitigated by caching and scheduling)
- Source code repositories may be reorganized

### Medium Risk
- Code formatting differences causing false failures
- Multi-line code snippets spanning different lines

### Low Risk
- Network failures (handled by retry logic)
- Token expiration (use public API where possible)

---

## Success Criteria

1. All existing citations verified or documented as needing updates
2. Automated CI pipeline catches citation drift
3. Standard parameter types reduce code duplication
4. Clear documentation for adding new citations
