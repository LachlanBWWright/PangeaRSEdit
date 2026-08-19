# Tightening Item Params, Citations, and Static Model Analysis

## Goal

Make item model selection in the 3D view statically auditable, especially for games where an item's model, transform, or visibility is controlled by arbitrary terrain params. Bugdom 1 is the immediate motivator: several current mappings are static approximations, but the game source often chooses model file, model index, rotation, position, scale, or child objects from `parm[]`, flags, and level type.

## Current Shape

- Parameter meaning lives mainly in `frontend/src/data/items/*ItemType.ts` as free-form parameter descriptions with optional code samples.
- Renderable item model mappings live separately in `frontend/src/data/items/*ItemModelMapping.ts` and mapper classes under `frontend/src/data/items/mappers/`.
- `UniversalItemModelMapping` can express a single model, simple `variants`, `rotationParam`, `scaleParam`, offsets, and citations, but it cannot describe several common source patterns precisely.
- Citations are mostly textual evidence. They are useful for humans, but the code cannot use them to prove that every model-affecting source expression is represented in the model mapping.
- Bugdom 1's mapper currently ignores `params` and `levelNum`, even though the source uses both heavily.

## Problems To Solve

1. **Params are not modeled as typed domains.**
   A param can be a bounded enum, bitset, rotation step, model selector, height offset, ID, or special-case value. Today these meanings are expressed inconsistently, which prevents static checks such as "all enum values have model variants".

2. **Citations are not tied to semantics.**
   A citation can show `gNewObjectDefinition.type = HIVE_MObjType_DetonatorGreen + itemPtr->parm[1]`, but the mapping does not have a machine-readable assertion that `p1` selects a model index range.

3. **Model mapping cannot represent multi-output item creation.**
   `AddDetonator` creates both the box and plunger. `AddWaterValve` creates box and handle. A single `UniversalItemModelMapping` with one `modelIndex` cannot faithfully describe these items.

4. **Level-specific groups are not first-class.**
   Bugdom 1 `AddRock` selects different model files, indices, and scales for lawn, forest, and night. The current mapping points at one lawn model only.

5. **Static analysis cannot distinguish approximate mappings from verified mappings.**
   An approximate preview may be useful, but it should be visibly different from a verified source-derived mapping and should fail stricter audit checks.

## Proposed Data Model

Introduce a source-derived item definition layer that is stricter than the current mapping table. Keep it data-only and parse it with Zod at the boundary.

```ts
type ParamSlot = "p0" | "p1" | "p2" | "p3" | "flags";

type ItemParamDomain =
  | { kind: "unknown" }
  | { kind: "integer"; min?: number; max?: number }
  | { kind: "enum"; values: ReadonlyArray<{ value: number; label: string }> }
  | { kind: "bitset"; bits: ReadonlyArray<{ index: number; label: string }> }
  | { kind: "rotation"; divisions: number; offsetRadians?: number }
  | { kind: "scale"; defaultValue: number; multiplier?: number; min?: number; max?: number }
  | { kind: "heightOffset"; unitsPerStep: number; defaultValue?: number };

type SourceExpression =
  | { kind: "constant"; value: number | string }
  | { kind: "param"; slot: ParamSlot }
  | { kind: "add"; left: SourceExpression; right: SourceExpression }
  | { kind: "multiply"; left: SourceExpression; right: SourceExpression }
  | { kind: "bit"; slot: ParamSlot; bitIndex: number }
  | { kind: "levelSwitch"; cases: ReadonlyArray<LevelCase<SourceExpression>> };

type ModelPartDefinition = {
  partId: string;
  modelFile: SourceExpression;
  modelIndex: SourceExpression;
  scale?: SourceExpression;
  rotationY?: SourceExpression;
  positionOffset?: {
    x?: SourceExpression;
    y?: SourceExpression;
    z?: SourceExpression;
  };
  when?: SourceExpression;
  citations: ReadonlyArray<SemanticCitation>;
};

type SemanticCitation = {
  file: string;
  line: number;
  endLine?: number;
  proves:
    | "item-add-routine"
    | "model-group"
    | "model-index"
    | "model-file"
    | "scale"
    | "rotation"
    | "position"
    | "param-domain"
    | "child-object"
    | "level-condition";
  snippetHash?: string;
};
```

The concrete implementation can use narrower names and existing `Game`/`ItemType` types, but the important change is that params, source expressions, and citations become linked facts instead of parallel prose.

## Static Analysis Rules

Add an item model audit that can run in tests and in the existing item audit page.

- Every item with a display model must have an item add routine citation or an explicit `notRenderable` reason.
- Every model-affecting param expression must reference a declared param domain.
- Every enum or bounded selector used for `modelIndex` must cover every declared value or have a typed fallback.
- Every `levelSwitch` must cover the levels where the source add routine accepts the item.
- Every `ModelPartDefinition` must cite the source line that proves its model index and, when applicable, scale, rotation, and position.
- Mappings with random runtime transforms must mark the transform as `runtimeRandom` so audits do not treat the absence of a deterministic param as a bug.
- Existing approximate mappings can be carried forward with `verificationStatus: "approximate"`, but strict static analysis should report them.

## Migration Plan

1. **Add typed source-derived definitions beside current mappings.**
   Start with one game file such as `bugdomItemModelDefinitions.ts`. Do not replace the viewer immediately.

2. **Add Zod schemas and a pure evaluator.**
   Evaluate a model definition from `{ itemType, levelType, params, flags }` into one or more concrete render parts. Return `Result` for invalid params or unsupported cases.

3. **Bridge to `UniversalItemModelMapping`.**
   Convert the evaluated render parts into the current viewer shape, adding support for multiple parts where needed. Keep old mappings as fallback.

4. **Add audit tests.**
   Tests should check source-derived definitions for coverage, citation presence, and param-domain coverage. Keep source file references local where possible so the tests do not depend on network access.

5. **Migrate Bugdom 1 first.**
   Bugdom 1 has a compact item table and clear add routines, but enough param/level complexity to validate the model.

6. **Migrate the games with existing param-dependent mappings.**
   Otto Matic, Bugdom 2, Nanosaur 1/2, Cro-Mag, and Billy Frontier can then move repeated `variants` patterns into the stricter definition model.

## Bugdom 1 Quick Review

### High-Risk Incorrect Or Incomplete Current Mappings

- `Rock` is level- and param-dependent. Source `AddRock` selects lawn, forest, or night model groups, applies `parm[0]` as a model index offset, and uses different scales (`4.0`, `.9`, `.6`). Current mapping always uses `Lawn_Models2.3dmf` index `8`, so forest/night rocks and `p0 = 1` are wrong.
- `LawnDoor` is level-, param-, and flag-dependent. Source selects lawn or night door files, uses `p0` for color/key model index, uses `p1` for rotation, and flips rotation when `ITEM_FLAGS_USER1` means already open. Current mapping only points to `Lawn_Models1.3dmf` index `1` and has no param-driven color or night support.
- `HoneycombPlatform` uses `p0` bit 0 for brick versus steel, `p1` for elevation, and `p3` bit 1 for small scale. Current mapping only shows brick platform index `0` and does not model height or small scale.
- `Detonator` creates two objects: box color from `p1` and a plunger child at a y offset based on `ITEM_FLAGS_USER1`. Current mapping only shows index `4`; it misses color variants and the plunger part.
- `HoneyTube` uses `p0` for tube shape, remaps `p0 = 1` to `2`, uses `p1` for rotation, and uses `p2` for scale. Current mapping only shows index `20`.
- `WaterValve` creates box and handle parts. Current mapping only shows the box index `0`.
- `BentAntPipe` and `HorizAntPipe` likely need rotation/scale review. The constants show distinct pipe scales, but current mappings only select static model indices.
- `Checkpoint` currently maps to `Night_Models.3dmf` door index `13`, but the terrain table calls `AddCheckpoint`; this should be verified separately because checkpoint semantics may not match a night door model.

### Items With No Runtime Model Or Special Rendering

- `StartCoords`, `FireFlyTargetLocation`, and NilAdd entries should be explicitly marked `notRenderable`.
- Liquid patch items (`WaterPatch`, `HoneyPatch`, `SlimePatch`, `LavaPatch`) should not pretend to be standard 3DMF item models unless the viewer has a patch-plane renderer.
- Fire wall and similar hazards may be effects or generated geometry rather than ordinary static model parts; they need source-derived definitions before mapping.

### Mapping Hygiene Issues

- Many current Bugdom 1 mapping comments cite enum names but not source lines. They should move to semantic citations with `proves` labels.
- The mapper does not accept or use `levelNum`/`params`, even though the interface supports them.
- There is no way to express "preview approximation". This makes wrong static mappings look equally trustworthy as source-confirmed ones.

## Suggested Bugdom 1 First Pass

Implement source-derived definitions for a small but representative set:

1. `Rock`: level switch, `p0` model index offset, scale per level.
2. `LawnDoor`: level switch, key/color selector, rotation param, open flag adjustment.
3. `HoneycombPlatform`: bit-derived model variant, elevation, small-scale flag.
4. `Detonator`: multi-part model with box and plunger.
5. `HoneyTube`: remapped selector, rotation param, scale param.

That set exercises enum params, bit flags, level switches, param arithmetic, multi-part output, source citations, and approximate/random transform markers without needing to migrate the whole game at once.
