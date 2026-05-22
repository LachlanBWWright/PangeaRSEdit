# Nanosaur 1 spline item param/model mapping

## Coverage

No spline-item system is present in Nanosaur 1 source.

## Source evidence

- Level loading reads only `OBJECT_LIST`, builds `TerrainItemEntryType` data, and routes exclusively through `gTerrainItemAddRoutines`. Source: `games/nanosaur/src/System/File.c:720-727`; `games/nanosaur/src/Terrain/Terrain2.c:39-63,71-237`.
- The source struct surface defines terrain items only for level item placement. Source: `games/nanosaur/src/Headers/structs.h:185-201`.

## Reconciliation note

Any existing editor spline mapping for Nanosaur 1 would be unsupported by the original game source.
