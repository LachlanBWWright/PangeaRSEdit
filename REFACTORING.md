# Code Refactoring Documentation

## Overview

This document describes the code refactoring work completed to improve code quality, maintainability, and organization in the PangeaRSEdit project.

## Goals

1. **Reduce file sizes**: Break down large files (>1000 lines) into smaller, focused modules
2. **Extract reusable components**: Identify and extract common patterns
3. **Improve code organization**: Create logical directory structures
4. **Reduce duplication**: Identify and consolidate duplicate code
5. **Maintain test coverage**: Ensure all changes pass existing tests

## Changes Made

### 1. AnimationViewer Component Refactoring ✅

**Impact**: 48% reduction in main component size

**Before**:
- Single file: `AnimationViewer.tsx` (1,436 lines)
- Monolithic component with mixed concerns
- Difficult to test and maintain

**After**:
- 12 focused files with clear responsibilities
- Main component: 748 lines (48% reduction)

**New Structure**:
```
frontend/src/components/AnimationViewer/
├── AnimationViewer.tsx      (748 lines) - Main orchestrating component
├── AnimationControls.tsx    (72 lines)  - Playback controls
├── AnimationSelector.tsx    (55 lines)  - Animation selection UI
├── AnimationEditor.tsx      (136 lines) - Property editing
├── KeyframeEditor.tsx       (366 lines) - Keyframe editing
├── AnimationMetadataDisplay.tsx (73 lines) - Metadata display
├── AnimationCreator.tsx     (64 lines)  - New animation creation
├── hooks.ts                 (137 lines) - useAnimationPlayback hook
├── utils.ts                 (130 lines) - Utility functions
├── types.ts                 (37 lines)  - Type definitions
├── constants.ts             (11 lines)  - UI constants
└── index.ts                 (15 lines)  - Module exports
```

**Benefits**:
- Easier to understand each component's responsibility
- Improved testability (can test each component in isolation)
- Reduced cognitive load when working on specific features
- Clearer import statements
- Better code navigation

### 2. IntroPrompt Utilities Extraction ✅

**Files Created**:
- `frontend/src/editor/IntroPrompt/historyHooks.ts` (89 lines)
- `frontend/src/editor/IntroPrompt/canvasUtils.ts` (51 lines)

**Benefits**:
- Reusable history management (undo/redo) logic
- Separated canvas creation utilities
- Can be tested independently
- Cleaner main component

### 3. Tiles Component Utilities ✅

**Files Created**:
- `frontend/src/editor/subviews/tiles/tileTypes.ts` - Shared type definitions
- `frontend/src/editor/subviews/tiles/tileClickHandlers.ts` (68 lines) - Click handler factory

**Benefits**:
- Reduced duplication in tile editing components
- Consistent tile interaction patterns
- Easier to add new tile types

### 4. Tiles.tsx Refactoring ✅

**Impact**: 58% reduction, eliminated 188 lines of duplication

**Before**:
- Single file: `Tiles.tsx` (532 lines)
- Three nearly-identical components: `EmptyTiles`, `ElectricFloor0Tiles`, `ElectricFloor1Tiles`
- Massive code duplication (only differed in flag bits)

**After**:
- Main file: `Tiles.tsx` (224 lines) - 58% reduction
- Extracted: `FlagTileEditor.tsx` (120 lines) - Generic reusable component
- Total: 344 lines vs original 532 lines = **-188 lines** of duplication

**New Structure**:
```
frontend/src/editor/subviews/tiles/
├── FlagTileEditor.tsx  (120 lines) - Generic flag-based tile editor
├── tilesUtils.ts       - Shared utilities
├── tileTypes.ts        - Type definitions
└── tileClickHandlers.ts - Click handler factory
```

**Benefits**:
- Single generic component handles all flag-based tile editing
- Easy to add new tile flag types (just pass flagBit and flagToColour)
- Eliminates 3 nearly-identical components
- Cleaner, more maintainable code

### 5. Shared Item Editor Components ✅

**Files Created**:
- `frontend/src/editor/subviews/items/ParameterField.tsx` (78 lines)

**Benefits**:
- Single source of truth for parameter editing UI
- Handles both regular inputs and bit flag checkboxes
- Used by ItemMenu, MightyMikeItemMenu, and SplineSubmenus
- Reduces ~150 lines of duplicate code

## Code Duplication Analysis

### Detected Duplicates (using jscpd)

**High Priority** (>80 lines):
- ItemMenu.tsx ↔ SplineSubmenus.tsx: 98 lines, 922 tokens
- ItemMenu.tsx ↔ MightyMikeItemMenu.tsx: 85 lines, 638 tokens

**Medium Priority** (40-80 lines):
- Tiles.tsx internal duplication: 207 lines
- Item.tsx ↔ MightyMikeItem.tsx: 40 lines, 247 tokens

**Status**: Partially addressed with ParameterField component

### Recommendations for Future Work

1. **Complete Tiles.tsx Refactoring**
   - Extract common base TileViewer component
   - Estimated impact: 200+ line reduction

2. **Consolidate Remaining ItemMenu Code**
   - Create ItemParamEditor wrapper using ParameterField
   - Extract shared validation logic
   - Estimated impact: 100+ line reduction

3. **Parser Utilities**
   - Extract common binary reading patterns
   - Create shared helpers for parseBG3D.ts and parse3DMF.ts
   - Estimated impact: 100-200 line reduction per parser

## File Size Guidelines

### Current Guidelines
- **Small**: <200 lines (ideal for single-purpose files)
- **Medium**: 200-500 lines (acceptable for complex components)
- **Large**: 500-1000 lines (consider refactoring)
- **Very Large**: >1000 lines (high priority for refactoring)

### Exception Categories
- **Data definitions** (enums, mappings): Can be >1000 lines
- **Sample/test data**: Can be very large
- **Binary format parsers**: Complex but unavoidable
- **Type definitions**: Interface files can be large

## Testing Strategy

### Approach
1. Run full test suite before changes
2. Make incremental refactoring changes
3. Run tests after each significant change
4. Verify no breaking changes

### Results
- All tests passing ✅
- No regression introduced
- Test coverage maintained

## Best Practices Established

### Component Structure
```tsx
/**
 * Component documentation
 */

// Imports organized by category
import { React } from "react";
import { ExternalLib } from "external-lib";
import { LocalComponent } from "./LocalComponent";
import type { MyType } from "./types";

// Type definitions
interface ComponentProps {
  // ...
}

// Component implementation
export function MyComponent({ ...props }: ComponentProps) {
  // ...
}
```

### Directory Structure
```
ComponentName/
├── ComponentName.tsx    # Main component
├── SubComponent.tsx     # Sub-components
├── hooks.ts             # Custom hooks
├── utils.ts             # Utility functions
├── types.ts             # Type definitions
├── constants.ts         # Constants
└── index.ts             # Module exports
```

### Import/Export Patterns
- Use named exports (not default exports)
- Create index.ts files for clean imports
- Group related functionality

## Metrics

### Before Refactoring
- Largest component: 1,436 lines (AnimationViewer)
- Large files (>500 lines): AnimationViewer (1,436), Tiles (532)
- Code duplication: ~500+ lines detected

### After Refactoring
**AnimationViewer**:
- Reduced from 1,436 lines to 748 lines (48% reduction)
- Extracted into 12 focused files
- Net: +440 lines across utility files, but significantly better organized

**Tiles.tsx**:
- Reduced from 532 lines to 224 lines (58% reduction)
- Extracted FlagTileEditor (120 lines)
- Net: **-188 lines** of eliminated duplication
- Removed 3 nearly-identical component implementations

**Overall Impact**:
- **Total duplication eliminated**: ~340+ lines
- **Files refactored**: 2 major components
- **New utility files created**: 16 files
- **Better code organization**: Component responsibilities clearly separated
- **Improved maintainability**: Easier to test, modify, and extend

## Tools Used

- **jscpd**: Code duplication detection
- **ESLint**: Code quality enforcement
- **TypeScript**: Type safety
- **Vitest**: Test runner

## Related Documentation

- [AnimationViewer Components](./frontend/src/components/AnimationViewer/README.md)
- [Editor Architecture](./frontend/src/editor/README.md)
- [Testing Guide](./frontend/tests/README.md)

## Contributors

- Refactoring work by Claude Code (Anthropic)
- Original codebase by PangeaRSEdit team
