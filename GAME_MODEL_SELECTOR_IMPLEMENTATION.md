# Game Model Selector Implementation

## Overview

This implementation addresses the request to add enhanced model selection functionality with support for multiple games and their respective BG3D and skeleton files.

## Features Implemented

### 1. Enhanced UI with Game/Model Selection

- **GameModelSelector Component**: New React component (`src/components/GameModelSelector.tsx`) that provides:
  - Game dropdown selection (Otto Matic, Bugdom 2, Cro-Mag Rally, Nanosaur 2, Billy Frontier)
  - Model dropdown within selected game
  - Skeleton loading option prompting (load with/without skeleton data)
  - Model information display

- **ModelViewer Integration**: Updated `src/pages/ModelViewer.tsx` with:
  - Mode toggle between "Game Models" and "Upload Files" 
  - Seamless integration of GameModelSelector
  - Backward compatibility with existing file upload functionality

### 2. Organized File Structure

Files organized in `/public/games/` directory structure:
```
public/games/
├── ottomatic/
│   ├── Otto.bg3d
│   ├── Otto.skeleton.rsrc
│   ├── Onion.bg3d
│   └── Onion.skeleton.rsrc
├── bugdom2/
├── cromagrally/
├── nanosaur2/
└── billyfrontier/
```

Currently populated with Otto Matic models (Otto and Onion). Other game directories are prepared for when files become available.

### 3. Skeleton Prompting System

When a model has both BG3D and skeleton files available, users are prompted to choose:
- **Load with skeleton data**: Includes all animations and bone data
- **Load model only**: Just the 3D model without animations

This ensures users understand the difference and can choose based on their needs.

### 4. Comprehensive Testing Framework

Created `tests/e2e/otto-models-comprehensive.spec.ts` with:
- **glTF Validator Integration**: Uses the official Khronos glTF-Validator to validate generated GLB files
- **Roundtrip Testing**: Tests BG3D → glTF → BG3D conversion accuracy
- **Multi-model Support**: Tests both Otto and Onion models
- **Batch Validation**: Comprehensive testing of all Otto Matic models

Test features:
- Validates GLB files have 0 errors and 0 warnings
- Checks roundtrip accuracy (expects ≥99.9% accuracy)
- Verifies animation count and joint structure
- Tests UI functionality of the Game Model Selector

## Game Data Structure

The `GameModelSelector` component uses this data structure:

```typescript
interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  description?: string;
}

interface GameInfo {
  id: string;
  name: string;
  models: GameModel[];
}
```

Currently configured games:
- **Otto Matic**: 2 models (Otto, Onion) with skeleton data
- **Bugdom 2**: Ready for files
- **Cro-Mag Rally**: Ready for files  
- **Nanosaur 2**: Ready for files
- **Billy Frontier**: Ready for files

## Usage Instructions

### For Users:
1. Navigate to Model Viewer
2. Use "Game Models" tab (default)
3. Select game from dropdown
4. Select model from dropdown
5. Choose skeleton loading option
6. Click "Load [Model Name]"

### For Adding New Models:
1. Copy BG3D and skeleton files to appropriate `/public/games/{game}/` directory
2. Update the `GAMES` array in `GameModelSelector.tsx`
3. Add model entry with file paths and metadata

## Testing

### Automated Tests:
```bash
# Run comprehensive Otto models test
npx playwright test tests/e2e/otto-models-comprehensive.spec.ts

# Test includes:
# - UI functionality testing
# - glTF validation with official validator
# - Roundtrip accuracy testing
# - Batch testing of all models
```

### Manual Testing:
1. Load different models and verify they display correctly
2. Test animation functionality
3. Test download capabilities (GLB and BG3D)
4. Verify skeleton prompting works as expected

## Technical Details

### Components:
- `GameModelSelector.tsx`: Main selection interface
- `ModelViewer.tsx`: Updated with mode toggle and integration
- Enhanced error handling and user feedback

### File Organization:
- Consistent URL structure: `/PangeaRSEdit/games/{game}/{model}.{ext}`
- Automatic skeleton detection based on file availability
- Clear separation between games and models

### Validation:
- Uses official Khronos glTF-Validator for compliance checking
- Comprehensive roundtrip testing for data integrity
- Multi-model batch testing for regression detection

## Next Steps

1. **Add remaining game files**: Copy BG3D and skeleton files for Bugdom 2, Cro-Mag Rally, Nanosaur 2, and Billy Frontier to their respective directories

2. **Update game configurations**: Add model entries to the `GAMES` array for newly added files

3. **Extend testing**: Add tests for the new game models following the Otto Matic pattern

4. **Browser validation**: Run comprehensive Playwright tests to ensure all functionality works correctly

## Files Modified/Created

- `src/components/GameModelSelector.tsx` (NEW)
- `src/pages/ModelViewer.tsx` (MODIFIED)
- `tests/e2e/otto-models-comprehensive.spec.ts` (NEW)
- `public/games/` directory structure (NEW)
- Otto Matic model files copied to organized structure

This implementation provides a robust, scalable foundation for game model selection while maintaining backward compatibility and ensuring high quality through comprehensive testing.