# Runtime Level Data Not Yet Editable

This document tracks data stored in supported level formats that is read and
used by the games, but cannot currently be changed through PangeaRSEdit.

It deliberately excludes:

- data belonging to separate editor workflows rather than the games;
- resource-fork metadata, resource names, resource ordering and aliases;
- padding, reserved fields and obsolete pointer values;
- cached counts and bounding boxes that should be regenerated from authored
  geometry instead of edited directly;
- values that are parsed but for which no runtime read could be established.

## Implemented from this audit

The following gaps have now been implemented:

- Cro-Mag `Path`, `PaPt` and `CkPt` parsing and structured round-tripping;
- Cro-Mag path and checkpoint controls in Supertiles, including Konva editing;
- named Cro-Mag surface-attribute painting;
- named Nanosaur surface-attribute painting;
- preservation, raster visualization and painting of Nanosaur's path layer;
- named saved-state checkboxes for the confirmed terrain-item cases below;
- Mighty Mike tile-animation and transparency-table editing;
- save-time regeneration of entity counts, point counts and bounds.

## Original highest-priority gaps

### Cro-Mag Rally paths

Cro-Mag reads `Path` resource 1000 and one `PaPt` resource per path. A path
contains flags, three parameters, a point count and a point list. The header's
`numPaths` field controls how many paths are loaded.

None of these resources are represented by the current Cro-Mag struct
specification or editor. Consequently paths cannot be viewed, created, moved,
deleted or configured.

Runtime evidence: `games/originals/cromagrally/Source/System/File.c`, in the
"PATH RELATED RESOURCES" section.

### Cro-Mag Rally checkpoints

Cro-Mag reads `CkPt` resource 1000 and uses the resulting line segments for
lap and checkpoint progression. Although the header exposes `numCheckpoints`,
the Cro-Mag struct specification does not currently parse `CkPt`, and the game
feature configuration disables checkpoint editing for Cro-Mag.

Runtime evidence:

- `games/originals/cromagrally/Source/System/File.c`
- `games/originals/cromagrally/Source/Terrain/Checkpoints.c`

### Nanosaur path layer

The Nanosaur classic-level parser reads `pathLayerOffset` and the associated
path-layer grid. The conversion into the editor's shared `LevelData` model does
not retain a user-editable path layer.

Before implementing this, each path-layer bit and value should be mapped to its
runtime meaning. The current editor cannot paint or otherwise alter it.

## Terrain attributes

### Cro-Mag Rally surface flags

Cro-Mag uses all eight tile-attribute flag bits at runtime:

- ice;
- snow;
- kick up dust;
- kick up mud;
- kick up snow;
- kick up grass;
- suppress skid marks;
- rock.

The editor's generic tile-flag modes do not provide controls for these surface
properties.

Runtime evidence: `games/originals/cromagrally/Source/Headers/terrain.h` and
`Source/Player/Player.c`.

### Nanosaur surface flags and extended attributes

Nanosaur uses tile flags for collision sides, dust, lava and water. Its classic
texture-attribute structure also contains `bits`, `parm0`, `parm1` and `parm2`.
These values are imported into the shared terrain representation, but the
individual-tile editor explicitly does not offer attribute painting.

Confirmed runtime-used flags include:

- top, bottom, left and right solidity;
- dust generation;
- lava;
- water.

Runtime evidence: `games/originals/nanosaur/src/Headers/terrain.h` and player
terrain/control code.

## Persistent terrain-item state

Terrain items contain a `flags` field. Bit 0 is engine bookkeeping
(`ITEM_FLAGS_INUSE`) and should not be presented as authored level state.
However, the games use user bits to remember persistent object state.

The editor now exposes a checkbox only where its item metadata already provides
a confirmed meaning. The following runtime-used cases remain incomplete where
their item metadata has not yet been annotated.

### Otto Matic

Examples include the burned state of the jungle pitcher-plant boss and the
destroyed state of its pod.

### Bugdom

Examples include:

- Water Bug paid-for state;
- detonated plunger state;
- opened doors;
- opened valves.

### Bugdom 2

Many `USER1` meanings are already documented, but multi-bit states are still
incomplete. A notable case is the three-chip door, which uses `USER1`, `USER2`
and `USER3` independently to record collected chips.

### Nanosaur 2

Confirmed persistent states include:

- destroyed electrodes;
- rescued eggs;
- destroyed crystals;
- destroyed forest-door keys.

## Mighty Mike

### Tile animations

The Mighty Mike tileset format contains animation definitions with a name,
speed, base tile, frame count and frame tile numbers. They are parsed and used
by the game, but PangeaRSEdit has no animation editor.

### Transparency colors

The tileset's transparency-color table determines which palette value is
transparent for tile rendering and pixel-accurate masking. The editor consumes
this information, but cannot change the table itself.

### Incomplete tile-attribute coverage

Mighty Mike tile definitions contain a flag word and parameters `p0` through
`p4`. The current inspector provides semantic controls for known collision and
path properties, but not every runtime-used flag and parameter combination has
been mapped to an editor control.

Unknown values should remain preserved until their runtime meanings are known;
they should not be exposed as raw flag numbers.

## Bugdom 2 tunnel levels

The tunnel editor covers items, spline placement, sections, textures and many
mesh transformations. It does not provide arbitrary editing of every
runtime-consumed mesh field.

Remaining low-level gaps include:

- editing individual mesh vertices;
- editing individual normals;
- editing individual texture coordinates;
- editing triangle indices/topology independently of section operations.

These are genuine runtime inputs, although a raw table editor would not be a
good interface. Mesh-aware tools would be required.

## Data that should remain derived

The following values are read by the games but should normally be recalculated
by PangeaRSEdit, not exposed as editable fields:

- header item, spline, fence, liquid, checkpoint, path and section counts;
- fence, spline and liquid point counts;
- fence, spline and liquid bounding boxes;
- generated spline point lists when spline control nubs change.

They still warrant save-time validation. A missing editor input is not a
problem if the value is consistently regenerated from the authored data.

## Completed implementation order

1. [x] Add Cro-Mag `Path`, `PaPt` and `CkPt` parsing and round-trip tests.
2. [x] Add Cro-Mag path and checkpoint editing.
3. [x] Add named Cro-Mag and Nanosaur terrain-attribute brushes.
4. [x] Preserve and expose the Nanosaur path layer.
5. [x] Complete the confirmed per-item saved-state annotations listed above.
6. [x] Add Mighty Mike tile-animation and transparency-table editing.
7. [x] Regenerate derived counts and bounds immediately before serialization.
