# rsrcdump-ts Migration

## Overview

The editor has successfully migrated from Pyodide (Python/WebAssembly) to rsrcdump-ts (native TypeScript) for resource fork parsing.

## Migration History

### Phase 1: Initial Migration (v1.0.2)
- Replaced Pyodide worker with rsrcdump-ts npm package
- Removed 3MB+ of Python/WebAssembly assets
- Simplified parsing pipeline (no worker messages)
- Added Buffer polyfill for browser compatibility

### Phase 2: Bug Discovery (v1.0.4 - v1.0.5)
- Discovered null/undefined bug for numeric zeros
- Discovered STgd parsing failure (Otto Matic, Cro-Mag Rally)
- Created nullToZeroFixer workaround
- Enhanced preprocessing for liquid data

### Phase 3: Complete Fix (v1.0.6)
- Package author fixed both critical bugs
- Removed need for workarounds (kept for safety)
- 100% validation test pass rate
- All 6 games working perfectly

## Known Issues (Resolved)

### Issue 1: Otto Matic Liquid Loading
**Problem:** rsrcdump macro behavior changed between versions
- Old format: Individual fields (x_0, y_0, x_1, y_1, etc.)
- New format: Structured nubs array

**Solution:**
- Updated preprocessJson to handle both formats
- Graceful fallback for missing data
- Backwards compatible with old levels

### Issue 2: shadcn UI Component Backgrounds
**Problem:** Dropdowns and modals had no visible backgrounds
- Dark mode CSS variables too dark (3.9% lightness)
- Components invisible against dark background

**Solution:**
- Updated CSS variables for better visibility
- Increased lightness values (18-24%)
- Proper contrast for UI elements

### Issue 3: Toast Notifications Persisting
**Problem:** Toast notifications remained visible indefinitely
- No auto-dismiss configured
- Screen clutter from accumulated toasts

**Solution:**
- Added 4-second duration to Toaster
- Automatic dismissal after timeout
- Clean, professional notification system

### Issue 4: Confusing Topology Editing
**Problem:** Green layer covered entire terrain
- Preview layer obscured actual terrain
- Confusing user experience
- Performance overhead

**Solution:**
- Disabled full-terrain preview
- Simple green circle/square indicator
- Direct heightmap modification
- Clear, intuitive workflow

## Benefits of Migration

### Performance
- **Faster loading**: No WebAssembly initialization delay
- **Smaller bundle**: 3MB+ reduction in assets
- **Better caching**: npm packages cached efficiently

### Developer Experience
- **Simpler debugging**: Native TypeScript stack traces
- **Type safety**: Full TypeScript integration
- **Easier testing**: No worker complexity

### User Experience
- **Faster startup**: Instant resource parsing
- **Better error messages**: Clear TypeScript errors
- **More reliable**: No worker communication failures

## Technical Details

### rsrcdump-ts Package Versions

**v1.0.2**
- Initial browser-compatible release
- Fixed boolean handling
- Removed fs/promises dependency

**v1.0.4**
- Attempted browser compatibility improvements
- null/undefined bug persisted
- STgd parsing issues

**v1.0.5**
- Partial bug fixes
- 75% validation pass rate
- Enhanced workarounds needed

**v1.0.6 (Current)**
- **Complete fix for null/undefined bug**
- **Fixed STgd parsing**
- **100% validation pass rate**
- All workarounds now optional

### Backwards Compatibility

The nullToZeroFixer is kept as a safety net:
- Handles edge cases in preprocessing
- Supports older rsrcdump-ts versions
- Defensive programming practice
- No performance impact

## Future Improvements

Potential enhancements:
- [ ] Remove nullToZeroFixer after extended testing
- [ ] Optimize preprocessing pipeline
- [ ] Add validation caching
- [ ] Implement progressive parsing for large levels

## Related Files

- `editor/loadLogic/parseRsrcLevelFile.ts` - Main parsing entry point
- `data/processors/ottoPreprocessor.ts` - Preprocessing logic
- `data/processors/nullToZeroFixer.ts` - Safety net for null values
- `validation/validateLevelForGame.ts` - Validation system
