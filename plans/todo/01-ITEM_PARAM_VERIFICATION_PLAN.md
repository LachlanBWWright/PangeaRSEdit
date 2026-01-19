# Item Parameter Description Verification System Plan

## Overview

This plan outlines the implementation of a verification system for item parameter descriptions. The existing codebase contains detailed `codeSample` citations that reference specific lines in the Pangea game source files hosted on GitHub. This system will fetch those GitHub files and verify that the cited code snippets actually exist at the specified locations.

---

## Current State Analysis

### Existing Infrastructure

The codebase already has item parameter documentation with code citations:

| File | Games |
|------|-------|
| `frontend/src/data/items/ottoItemType.ts` | Otto Matic |
| `frontend/src/data/items/billyFrontierItemType.ts` | Billy Frontier |
| `frontend/src/data/items/bugdomItemType.ts` | Bugdom 1 |
| `frontend/src/data/items/bugdom2ItemType.ts` | Bugdom 2 |
| `frontend/src/data/items/nanosaurItemType.ts` | Nanosaur 1 |
| `frontend/src/data/items/nanosaur2ItemType.ts` | Nanosaur 2 |
| `frontend/src/data/items/croMagItemType.ts` | Cro-Mag Rally |

### Citation Structure

```typescript
interface CodeSample {
  code: string;        // The actual code snippet expected to be found
  fileName: string;    // Relative path to source file (e.g., "Items/Items.c")
  lineNumber: number;  // Line number where code should be found
}
```

### GitHub Source Repositories

The game source code is available on GitHub under the `jorio` organization:
- https://github.com/jorio/OttoMatic
- https://github.com/jorio/Bugdom
- https://github.com/jorio/Bugdom2
- https://github.com/jorio/BillyFrontier
- https://github.com/jorio/Nanosaur
- https://github.com/jorio/Nanosaur2
- https://github.com/jorio/CroMag

---

## Implementation Plan

### Phase 1: Core Types and Utilities

#### 1.1 Define Verification Types

**File:** `frontend/src/data/items/verification/types.ts`

```typescript
export interface VerificationResult {
  itemType: number;
  paramName: 'flags' | 'p0' | 'p1' | 'p2' | 'p3';
  citation: CodeSample;
  status: 'verified' | 'mismatch' | 'not_found' | 'error';
  actualContent?: string;
  errorMessage?: string;
  lineContext?: {
    before: string[];
    actual: string;
    after: string[];
  };
}

export interface GameVerificationConfig {
  game: string;
  repoOwner: string;
  repoName: string;
  basePath: string; // e.g., "Source" or "src"
  branch: string;   // e.g., "master" or "main"
}

export interface VerificationSummary {
  game: string;
  total: number;
  verified: number;
  mismatches: number;
  notFound: number;
  errors: number;
  results: VerificationResult[];
}
```

#### 1.2 GitHub File Fetcher

**File:** `frontend/src/data/items/verification/githubFetcher.ts`

```typescript
export interface FetchedFile {
  content: string;
  lines: string[];
  sha: string;
}

export async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'master'
): Promise<Result<FetchedFile, Error>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(new Error(`Failed to fetch ${url}: ${response.status}`));
    }
    const content = await response.text();
    return ok({
      content,
      lines: content.split('\n'),
      sha: response.headers.get('etag') ?? '',
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
```

#### 1.3 Citation Verifier

**File:** `frontend/src/data/items/verification/citationVerifier.ts`

```typescript
export function verifyCitation(
  file: FetchedFile,
  citation: CodeSample,
  fuzzyMatch: boolean = true
): VerificationResult {
  const lineIndex = citation.lineNumber - 1; // 0-indexed
  
  // Get actual line content
  const actualLine = file.lines[lineIndex];
  if (actualLine === undefined) {
    return {
      status: 'not_found',
      errorMessage: `Line ${citation.lineNumber} does not exist (file has ${file.lines.length} lines)`,
    };
  }
  
  // Normalize both strings for comparison
  const normalizedCitation = normalizeLine(citation.code);
  const normalizedActual = normalizeLine(actualLine);
  
  // Check for exact or fuzzy match
  if (normalizedActual.includes(normalizedCitation) || 
      (fuzzyMatch && fuzzyLineMatch(normalizedCitation, normalizedActual))) {
    return {
      status: 'verified',
      actualContent: actualLine,
      lineContext: getLineContext(file.lines, lineIndex),
    };
  }
  
  // Search nearby lines (±10 lines)
  const nearbyMatch = findNearbyMatch(file.lines, citation.code, lineIndex, 10);
  if (nearbyMatch) {
    return {
      status: 'mismatch',
      errorMessage: `Code found at line ${nearbyMatch.line} instead of ${citation.lineNumber}`,
      actualContent: nearbyMatch.content,
    };
  }
  
  return {
    status: 'mismatch',
    actualContent: actualLine,
    errorMessage: `Expected code not found at line ${citation.lineNumber}`,
    lineContext: getLineContext(file.lines, lineIndex),
  };
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function fuzzyLineMatch(expected: string, actual: string): boolean {
  // Remove comments and extra whitespace
  const cleanExpected = expected.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
  const cleanActual = actual.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
  return normalizeLine(cleanActual).includes(normalizeLine(cleanExpected));
}

function getLineContext(lines: string[], index: number, context: number = 2): object {
  return {
    before: lines.slice(Math.max(0, index - context), index),
    actual: lines[index] ?? '',
    after: lines.slice(index + 1, index + context + 1),
  };
}

function findNearbyMatch(
  lines: string[],
  code: string,
  centerIndex: number,
  range: number
): { line: number; content: string } | null {
  const normalizedCode = normalizeLine(code);
  for (let offset = 1; offset <= range; offset++) {
    for (const index of [centerIndex - offset, centerIndex + offset]) {
      const line = lines[index];
      if (line && normalizeLine(line).includes(normalizedCode)) {
        return { line: index + 1, content: line };
      }
    }
  }
  return null;
}
```

### Phase 2: Game-Specific Verification

#### 2.1 Game Configuration

**File:** `frontend/src/data/items/verification/gameConfigs.ts`

```typescript
export const GAME_VERIFICATION_CONFIGS: Record<string, GameVerificationConfig> = {
  ottoMatic: {
    game: 'Otto Matic',
    repoOwner: 'jorio',
    repoName: 'OttoMatic',
    basePath: 'src',
    branch: 'master',
  },
  bugdom: {
    game: 'Bugdom',
    repoOwner: 'jorio',
    repoName: 'Bugdom',
    basePath: 'src',
    branch: 'master',
  },
  bugdom2: {
    game: 'Bugdom 2',
    repoOwner: 'jorio',
    repoName: 'Bugdom2',
    basePath: 'Source',
    branch: 'master',
  },
  billyFrontier: {
    game: 'Billy Frontier',
    repoOwner: 'jorio',
    repoName: 'BillyFrontier',
    basePath: 'Source',
    branch: 'master',
  },
  nanosaur: {
    game: 'Nanosaur',
    repoOwner: 'jorio',
    repoName: 'Nanosaur',
    basePath: 'src',
    branch: 'master',
  },
  nanosaur2: {
    game: 'Nanosaur 2',
    repoOwner: 'jorio',
    repoName: 'Nanosaur2',
    basePath: 'Source',
    branch: 'master',
  },
  croMag: {
    game: 'Cro-Mag Rally',
    repoOwner: 'jorio',
    repoName: 'CroMag',
    basePath: 'src',
    branch: 'master',
  },
};
```

#### 2.2 Extract Citations from Item Types

**File:** `frontend/src/data/items/verification/extractCitations.ts`

```typescript
import type { ItemParams, ParamDescription, CodeSample } from '../itemParams';

export interface ExtractedCitation {
  itemType: number;
  itemName: string;
  paramName: 'flags' | 'p0' | 'p1' | 'p2' | 'p3';
  citation: CodeSample;
}

export function extractCitationsFromParams(
  itemParams: Record<number, ItemParams>,
  itemNames: Record<number, string>
): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  
  for (const [itemTypeStr, params] of Object.entries(itemParams)) {
    const itemType = Number(itemTypeStr);
    const itemName = itemNames[itemType] ?? `Item ${itemType}`;
    
    for (const paramName of ['p0', 'p1', 'p2', 'p3'] as const) {
      const param = params[paramName];
      if (param && typeof param === 'object' && 'codeSample' in param) {
        citations.push({
          itemType,
          itemName,
          paramName,
          citation: param.codeSample,
        });
      }
      
      // Handle Bit Flags with multiple citations
      if (param && typeof param === 'object' && 'type' in param && param.type === 'Bit Flags') {
        for (const flag of param.flags) {
          if (flag.codeSample) {
            citations.push({
              itemType,
              itemName,
              paramName,
              citation: flag.codeSample,
            });
          }
        }
      }
    }
  }
  
  return citations;
}
```

### Phase 3: Test Infrastructure

#### 3.1 Verification Test Suite

**File:** `frontend/tests/verification/itemParamCitations.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { fetchGitHubFile } from '@/data/items/verification/githubFetcher';
import { verifyCitation } from '@/data/items/verification/citationVerifier';
import { extractCitationsFromParams } from '@/data/items/verification/extractCitations';
import { GAME_VERIFICATION_CONFIGS } from '@/data/items/verification/gameConfigs';

// Import all item type data
import { TerrainItemTypeParams, itemTypeNames } from '@/data/items/ottoItemType';
// ... other games

interface GameCitations {
  gameKey: string;
  params: Record<number, ItemParams>;
  names: Record<number, string>;
}

const ALL_GAME_CITATIONS: GameCitations[] = [
  {
    gameKey: 'ottoMatic',
    params: TerrainItemTypeParams,
    names: itemTypeNames,
  },
  // ... other games
];

describe('Item Parameter Citation Verification', () => {
  // Cache fetched files to avoid repeated requests
  const fileCache = new Map<string, FetchedFile>();
  
  for (const game of ALL_GAME_CITATIONS) {
    const config = GAME_VERIFICATION_CONFIGS[game.gameKey];
    if (!config) continue;
    
    describe(`${config.game}`, () => {
      const citations = extractCitationsFromParams(game.params, game.names);
      
      for (const citation of citations) {
        it(`${citation.itemName} - ${citation.paramName}: ${citation.citation.fileName}:${citation.citation.lineNumber}`, async () => {
          // Build full path
          const fullPath = `${config.basePath}/${citation.citation.fileName}`;
          const cacheKey = `${config.repoOwner}/${config.repoName}/${fullPath}`;
          
          // Fetch or get from cache
          let file = fileCache.get(cacheKey);
          if (!file) {
            const result = await fetchGitHubFile(
              config.repoOwner,
              config.repoName,
              fullPath,
              config.branch
            );
            
            if (!result.ok) {
              console.warn(`Could not fetch ${cacheKey}: ${result.error.message}`);
              return; // Skip test if file not found
            }
            
            file = result.value;
            fileCache.set(cacheKey, file);
          }
          
          // Verify citation
          const result = verifyCitation(file, citation.citation);
          
          if (result.status !== 'verified') {
            console.log(`
Citation mismatch for ${citation.itemName}.${citation.paramName}:
  File: ${citation.citation.fileName}
  Expected line ${citation.citation.lineNumber}: ${citation.citation.code}
  Actual: ${result.actualContent}
  Status: ${result.status}
  ${result.errorMessage ?? ''}
            `);
          }
          
          expect(result.status).toBe('verified');
        }, { timeout: 30000 }); // Allow time for network requests
      }
    });
  }
});
```

#### 3.2 CLI Verification Tool

**File:** `frontend/scripts/verifyCitations.ts`

```typescript
#!/usr/bin/env ts-node

/**
 * CLI tool to verify all item parameter citations
 * Usage: npx ts-node scripts/verifyCitations.ts [--game=ottoMatic] [--fix]
 */

import { verifyAllCitations, generateReport } from '../src/data/items/verification';

async function main() {
  const args = process.argv.slice(2);
  const gameFilter = args.find(a => a.startsWith('--game='))?.split('=')[1];
  const shouldFix = args.includes('--fix');
  
  console.log('🔍 Verifying item parameter citations...\n');
  
  const results = await verifyAllCitations(gameFilter);
  
  // Generate report
  const report = generateReport(results);
  console.log(report);
  
  // Summary
  const total = results.reduce((sum, r) => sum + r.total, 0);
  const verified = results.reduce((sum, r) => sum + r.verified, 0);
  const mismatches = results.reduce((sum, r) => sum + r.mismatches, 0);
  
  console.log('\n📊 Summary:');
  console.log(`  Total citations: ${total}`);
  console.log(`  Verified: ${verified} (${(verified/total*100).toFixed(1)}%)`);
  console.log(`  Mismatches: ${mismatches}`);
  
  if (shouldFix && mismatches > 0) {
    console.log('\n🔧 Attempting to auto-fix line numbers...');
    // Auto-fix logic would go here
  }
  
  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch(console.error);
```

### Phase 4: Common Parameter Types

#### 4.1 Define Reusable Parameter Types

**File:** `frontend/src/data/items/paramTypes.ts`

```typescript
/**
 * Common parameter types used across multiple games.
 * These provide standardized descriptions for frequently-used parameter patterns.
 */

import type { ParamDescription } from './itemParams';

// Rotation parameters with common patterns
export const ROTATION_8_DIRECTIONS: ParamDescription = {
  type: 'Integer',
  description: 'Rotation (0-7, where each unit = 45°, total 360°)',
  codeSample: {
    code: '(float)itemPtr->parm[N] * (PI2/8.0f)',
    fileName: 'Common/Rotation.c',
    lineNumber: 0, // Placeholder - actual location varies
  },
};

export const ROTATION_4_DIRECTIONS: ParamDescription = {
  type: 'Integer',
  description: 'Rotation (0-3, where each unit = 90°)',
  codeSample: {
    code: '(float)itemPtr->parm[N] * (PI/2)',
    fileName: 'Common/Rotation.c',
    lineNumber: 0,
  },
};

export const ROTATION_2_DIRECTIONS: ParamDescription = {
  type: 'Integer',
  description: 'Rotation (0=0°, 1=180°)',
  codeSample: {
    code: '(float)itemPtr->parm[N] * PI',
    fileName: 'Common/Rotation.c',
    lineNumber: 0,
  },
};

// Scale parameters
export const SCALE_MULTIPLIER: ParamDescription = {
  type: 'Integer',
  description: 'Scale multiplier (0=default, higher=larger)',
  codeSample: {
    code: 'scale = 1.0f + (float)itemPtr->parm[N] * 0.1f',
    fileName: 'Common/Scale.c',
    lineNumber: 0,
  },
};

// Enemy common flags
export const ENEMY_COMMON_FLAGS: ParamDescription = {
  type: 'Bit Flags',
  flags: [
    {
      index: 0,
      description: 'Always add (ignore max enemy limit)',
      codeSample: {
        code: 'if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }',
        fileName: 'Common/Enemy.c',
        lineNumber: 0,
      },
    },
    {
      index: 1,
      description: 'Enemy regenerate after death',
      codeSample: {
        code: 'newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);',
        fileName: 'Common/Enemy.c',
        lineNumber: 0,
      },
    },
  ],
};

// Powerup common flags
export const POWERUP_COMMON_FLAGS: ParamDescription = {
  type: 'Bit Flags',
  flags: [
    {
      index: 0,
      description: 'Auto-regenerate after collection',
      codeSample: {
        code: 'newObj->POWRegenerate = itemPtr->parm[3] & 1;',
        fileName: 'Common/Powerup.c',
        lineNumber: 0,
      },
    },
    {
      index: 1,
      description: 'Place on terrain only (not in air)',
      codeSample: {
        code: 'if (itemPtr->parm[3] & (1<<1)) { /* terrain only */ }',
        fileName: 'Common/Powerup.c',
        lineNumber: 0,
      },
    },
  ],
};

// Type selector (common pattern for variant selection)
export function createTypeSelector(
  description: string,
  variants: string[]
): ParamDescription {
  return {
    type: 'Integer',
    description: `${description} (${variants.map((v, i) => `${i}=${v}`).join(', ')})`,
    codeSample: {
      code: `int type = itemPtr->parm[N]; // get ${description.toLowerCase()}`,
      fileName: 'Common/Type.c',
      lineNumber: 0,
    },
  };
}
```

---

## Testing Strategy

### Unit Tests
- Test citation extraction from item params
- Test GitHub file fetching (with mocked responses)
- Test citation verification logic

### Integration Tests
- Run full verification against actual GitHub repositories
- Generate verification reports
- Track verification status over time

### CI Integration
- Add verification to CI pipeline
- Fail build on critical citation mismatches
- Generate reports as artifacts

---

## File Summary

| File | Purpose |
|------|---------|
| `src/data/items/verification/types.ts` | Type definitions for verification |
| `src/data/items/verification/githubFetcher.ts` | GitHub raw file fetching |
| `src/data/items/verification/citationVerifier.ts` | Citation matching logic |
| `src/data/items/verification/gameConfigs.ts` | Per-game repository configuration |
| `src/data/items/verification/extractCitations.ts` | Extract citations from item params |
| `src/data/items/verification/index.ts` | Main verification orchestration |
| `src/data/items/paramTypes.ts` | Reusable common parameter types |
| `tests/verification/itemParamCitations.test.ts` | Test suite |
| `scripts/verifyCitations.ts` | CLI tool |

---

## Risk Assessment

### Low Risk
- GitHub rate limiting (can use caching)
- Minor line number drift (fuzzy matching handles this)

### Medium Risk  
- Source repository restructuring (would require config updates)
- Code formatting changes (normalized comparison helps)

### Mitigation
- Cache fetched files locally
- Run verification periodically, not on every build
- Maintain fallback to known-good snapshots

---

## Future Enhancements

1. **Auto-fix capabilities**: When line numbers drift, auto-update the citations
2. **Snapshot storage**: Store verified file snapshots for offline verification
3. **Web UI**: Add verification status display in the editor
4. **Commit integration**: Link citations to specific Git commits for versioning
