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

- [Otto Matic](./ottomatic/README.md)
- [Bugdom](./bugdom/README.md)
- [Bugdom 2](./bugdom2/README.md)
- [Nanosaur](./nanosaur/README.md)

## Loading Pipeline

1. **Fetch model file** (BG3D or 3DMF)
2. **Parse to intermediate format** (BG3DParseResult)
3. **Extract specific model** by index
4. **Convert to glTF** for Three.js rendering
5. **Apply transformations** (scale, rotation)
6. **Cache for reuse**
