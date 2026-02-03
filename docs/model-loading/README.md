# 3D Model Loading Documentation

This documentation describes how each Pangea game loads 3D models from their respective file formats.

## Overview

Pangea games use two primary 3D model formats:

1. **BG3D** (Binary Graphics 3D) - Used by newer games:
   - Otto Matic
   - Bugdom 2
   - Nanosaur 2
   - Billy Frontier
   - Cro-Mag Rally

2. **3DMF** (QuickDraw 3D Metafile) - Used by older games:
   - Bugdom
   - Nanosaur

## File Structure

Each game organizes models into:
- **Global models**: Used across all levels
- **Level-specific models**: Unique to each level
- **Skeleton models**: Character models with animation data

## Key Concepts

### Model Index
Within each BG3D/3DMF file, models are organized into indexed subgroups. The `modelIndex` refers to which subgroup to extract from the file.

### Material System
Models contain materials with:
- Diffuse color
- Texture maps
- Transparency flags
- UV coordinates

### Skeleton System
Animated characters use:
- Bone hierarchy
- Animation keyframes
- Skeleton resource files (.skeleton.rsrc)

## Game-Specific Documentation

| Game | Format | Documentation |
|------|--------|---------------|
| Otto Matic | BG3D | [README](./ottomatic/README.md) · [Item Mapping](./ottomatic/ITEM_TYPE_MAPPING.md) |
| Bugdom | 3DMF | [README](./bugdom/README.md) |
| Bugdom 2 | BG3D | [README](./bugdom2/README.md) · [Item Mapping](./bugdom2/ITEM_TYPE_MAPPING.md) |
| Nanosaur | 3DMF | [README](./nanosaur/README.md) |
| Nanosaur 2 | BG3D | [Nanosaur 2](./nanosaur/NANOSAUR2.md) |
| Cro-Mag Rally | BG3D | [README](./cromagrally/README.md) |
| Billy Frontier | BG3D | [README](./billyfrontier/README.md) |

## Loading Pipeline

1. **Fetch model file** (BG3D or 3DMF)
2. **Parse to intermediate format** (BG3DParseResult)
3. **Extract specific model** by index
4. **Convert to glTF** for Three.js rendering
5. **Apply transformations** (scale, rotation)
6. **Cache for reuse**

## Test Model Viewer

The application includes a Test Model Viewer (`/#/test-models`) that allows:
- Selecting any game
- Browsing model files (both regular and skeleton)
- Navigating through model indices within a file
- Viewing models in 3D with orbit controls

This is useful for:
- Discovering model indices for item type mappings
- Verifying model loading works correctly
- Exploring game assets
