# Model Viewer Animation, Weight, and UV Tools Plan

## Goal

Simplify the model viewer sidebar by folding the separate Bone Tools card into the Animations card, then use the empty animation-selection state for rig-editing tools. When an animation is selected, the timeline remains focused on animation playback, event editing, keyframes, and selected bone tracks. When no animation is selected, the same card becomes a skeleton and skinning workspace where users can rename bones, inspect vertex influence, visualize weights, and paint vertex weights with brush-style controls.

Extend Texture Management so texture popups can edit UV mapping alongside image replacement and image painting. The texture view should answer both questions a model editor naturally has: what image is assigned to this material, and how is the mesh mapped onto it?

## Current System Shape

- `frontend/src/pages/ModelViewer.tsx` owns model session state, selected bone state, bone rename input, bone transform values, bone influence summaries, texture state, and the sidebar card composition.
- `frontend/src/components/AnimationViewer/AnimationViewer.tsx` owns animation selection, selected timeline bone, selected track property, keyframe state, playback, animation events, and keyframe history.
- `frontend/src/components/AnimationViewer/AnimationViewerLayout.tsx` renders the Animations card and delegates timeline editing to `KeyframeEditor`.
- `frontend/src/components/AnimationViewer/KeyframeEditor.tsx` returns a small placeholder when no animation is selected, so the current empty state is where the new rig and weight tooling should live.
- `ModelViewer.tsx` currently renders a separate Bone Tools card only when a model has animations. It includes selected-bone rename plus a Bone-Vertex Influence Summary calculated from `SkinnedMesh` `skinIndex` and `skinWeight` attributes.
- `frontend/src/pages/ModelCanvas.tsx` already accepts `selectedBoneName`, `showSkeleton`, `gizmoMode`, and transform callbacks. It needs additional editing mode props before it can preview or paint vertex weights.
- `frontend/src/components/TextureManager.tsx` and `TextureManager/TextureItem.tsx` show texture previews, replacement controls, download controls, and open `ImageEditor`.
- BG3D geometry already stores `uvs?: [number, number][]` in `frontend/src/modelParsers/parseBG3D.ts`, and the BG3D/glTF conversion paths already read and write `TEXCOORD_0`.

## UX Direction

The Animations card should become a mode-aware animation and rigging card:

- The animation selector keeps a clear "No animation selected" option.
- Selecting an animation shows the current animation workflow: create, edit properties, playback timeline, keyframes, events, and metadata.
- Selecting no animation shows rig tools: bone search/select, rename, influence table, weight visualization mode, brush controls, and weight normalization actions.
- Bone rename should live next to the bone selector used by the timeline, not in a separate card. This keeps "which bone am I editing?" in one place.
- Vertex weight tools should feel like paint tools, not tables first. The table is useful for inspection, while the main workflow should be brush selection, radius, strength, target bone, paint/add/subtract/smooth modes, and live viewport feedback.

Texture Management should become texture and UV management:

- Each texture item keeps its compact preview and download/replace/edit image actions.
- The texture detail popup gains tabs for Image, UV Map, and Assignments.
- UV Map shows the texture image with UV islands drawn over it, with selectable vertices, edges, faces, and islands.
- UV editing starts with transform tools that are low-risk and familiar: move, rotate, scale, flip, fit to image, and snap to pixel grid.
- Brush-style UV editing can be added after transform editing: relax/smooth, pin/unpin, and nudge brushes.

## Animation Card Refactor

Move bone-tool state and behavior out of `ModelViewer.tsx` and into animation-adjacent modules:

- Add `frontend/src/components/AnimationViewer/RigToolsPanel.tsx`.
- Add `frontend/src/components/AnimationViewer/BoneRenameControl.tsx`.
- Add `frontend/src/components/AnimationViewer/WeightBrushPanel.tsx`.
- Add pure helpers under `frontend/src/components/AnimationViewer/rigToolsState.ts` for rename input state, selected-bone display data, and influence-row sorting.
- Add pure helpers under `frontend/src/modelEditing/weights/` for extracting, previewing, and editing skin weights.

`ModelViewer.tsx` should keep ownership of loaded scene state and persistence callbacks, but it should stop rendering a Bone Tools card. It should pass the loaded scene, selected bone, and typed callbacks into `AnimationViewer`.

Suggested `AnimationViewerProps` additions:

```ts
scene: Group | null;
selectedBoneName: string | null;
onRenameBone: (args: RenameBoneArgs) => ResultAsync<RenameBoneResult, string>;
weightEditingState: WeightEditingState;
onWeightEditingStateChange: (state: WeightEditingState) => void;
onApplyWeightEdit: (edit: WeightBrushEdit) => ResultAsync<WeightEditResult, string>;
```

Keep the exact prop shape smaller if a hook can own it, but preserve the boundary: `AnimationViewer` controls UI state, `ModelViewer` applies mutations to scene/BG3D/GLB state.

## Bone Rename Integration

Replace the standalone Bone Tools card with a rename control inside the Animations card:

- In selected-animation mode, put rename as a compact action near the Bone selector in `KeyframeEditor`.
- In no-animation mode, put rename at the top of `RigToolsPanel` next to bone search/select.
- Use the same selected bone value for timeline selection, skeleton viewport selection, influence filtering, and rename.
- After rename, update all affected data in one typed operation:
  - Three.js object names in the loaded scene.
  - Animation clip track names.
  - `bg3dParsed.skeleton.bones`.
  - `modelNodes` hierarchy.
  - selected bone state.
  - any weight-editing target-bone state.

Create a pure rename helper:

- `renameBoneInAnimationClips(args)`
- `renameBoneInBg3dSkeleton(args)`
- `renameBoneInModelNodes(args)`
- `buildRenameBoneResult(args)`

Each helper should return `Result` and avoid mutating input data except where an explicit scene mutation boundary is unavoidable.

## No Animation Selected State

Replace the current `KeyframeEditor` empty message with `RigToolsPanel`.

The panel should include:

- Bone selector/search with selected bone highlighted.
- Rename selected bone.
- Influence summary table with the selected bone pinned first.
- Weight visualization controls:
  - Off.
  - Selected bone heatmap.
  - All weights by dominant bone.
  - Unweighted vertices.
  - Overweight or under-normalized vertices.
- Brush controls:
  - Paint/add/subtract/smooth modes.
  - Radius.
  - Strength.
  - Falloff.
  - Normalize after stroke.
  - Mirror stroke when the skeleton naming convention supports it.
- Selection controls:
  - Select vertices influenced by selected bone.
  - Select unweighted vertices.
  - Clear selection.
- Repair actions:
  - Normalize selected vertices.
  - Prune tiny weights below a threshold.
  - Limit influences per vertex to four.

The viewport should show brush radius under the cursor and update weight colors as the user hovers or paints.

## Weight Editing Data Model

Add `frontend/src/modelEditing/weights/`.

Core files:

- `weightTypes.ts`
- `weightSchemas.ts`
- `extractSkinWeights.ts`
- `weightBrush.ts`
- `weightNormalization.ts`
- `weightVisualization.ts`
- `applyWeightEditToScene.ts`
- `applyWeightEditToBg3d.ts`

Suggested model:

```ts
export type WeightBrushMode = "paint" | "add" | "subtract" | "smooth";
export type WeightVisualizationMode =
  | "off"
  | "selected-bone"
  | "dominant-bone"
  | "unweighted"
  | "normalization-errors";

export interface WeightBrushSettings {
  readonly mode: WeightBrushMode;
  readonly radius: number;
  readonly strength: number;
  readonly falloff: "linear" | "smooth" | "constant";
  readonly normalizeAfterStroke: boolean;
}

export interface WeightEditingState {
  readonly visualizationMode: WeightVisualizationMode;
  readonly targetBoneName: string | null;
  readonly brush: WeightBrushSettings;
}
```

Unknown imported or persisted weight-tool settings should be parsed with Zod. Scene and geometry traversal should stay typed and narrow values explicitly at module boundaries.

## Weight Brush Behavior

First version:

- Raycast from the viewport cursor to the active skinned mesh.
- Convert hit point to affected vertex indices by radius in world or local space.
- Apply brush falloff per vertex.
- For paint mode, move the target bone weight toward brush strength.
- For add and subtract, increment or decrement target bone influence.
- For smooth, average selected vertices against nearby vertices.
- Normalize each edited vertex when enabled.
- Preserve the four-influence limit expected by Three.js skin attributes.
- Write changes to `skinIndex` and `skinWeight` attributes and flag attributes as needing update.

BG3D persistence needs investigation because the current parsed skeleton model stores bone-attached point lists rather than full arbitrary weighted influences. Treat this as two export paths:

- For glTF/GLB models, persist edited `skinIndex` and `skinWeight` through GLB export.
- For BG3D/skeleton resources, first support visualization and repair around the existing point-to-bone attachment model, then add export only when the binary skeleton writer can represent the edit without losing semantics.

## Texture and UV Management

Extend `TextureManager` from image-only actions to texture plus UV actions.

Add modules:

- `frontend/src/components/TextureManager/TextureDetailDialog.tsx`
- `frontend/src/components/TextureManager/UvMapEditor.tsx`
- `frontend/src/components/TextureManager/UvAssignmentPanel.tsx`
- `frontend/src/modelEditing/uv/uvTypes.ts`
- `frontend/src/modelEditing/uv/extractUvLayout.ts`
- `frontend/src/modelEditing/uv/uvTransforms.ts`
- `frontend/src/modelEditing/uv/applyUvEditToBg3d.ts`
- `frontend/src/modelEditing/uv/applyUvEditToScene.ts`

`TextureItem` should open `TextureDetailDialog` instead of an image-only dialog. The dialog should expose:

- Image tab: existing preview, replace, edit image, download.
- UV Map tab: image background plus UV overlay and transform tools.
- Assignments tab: materials and meshes using the texture, with counts for triangles, vertices, and UV islands.

## UV Editor Behavior

First version:

- Extract all geometries whose material references the selected texture.
- Build UV islands from triangle adjacency in UV space.
- Render UVs over the texture image in a 2D canvas or SVG overlay.
- Support selecting island, face, edge, and vertex.
- Support move, rotate, scale, flip U, flip V, fit to bounds, snap to pixel, and reset selection.
- Apply edits back to:
  - BG3D `geometry.uvs` when `bg3dParsed` is available.
  - Three.js geometry `uv` attributes for immediate viewport feedback.
  - GLB buffer through the existing worker/export path.

Defer:

- Unwrapping new UV islands.
- Seam marking.
- Packing islands.
- Multi-texture atlas operations.
- Procedural projection tools beyond planar projection.

## Persistence and Export

All edit operations should have one clear mutation boundary:

- Pure edit helpers produce typed edit results.
- UI calls a `ResultAsync` persistence callback.
- Persistence updates parsed data, scene attributes, generated GLB URL/buffer, texture list, and metadata together.

Texture replacement already regenerates GLB from `bg3dParsed`; UV edits should reuse that path where possible. For non-BG3D GLB files, use a GLB document transform path that updates `TEXCOORD_0` and normalizes the buffer before replacing `gltfBuffer` and `gltfUrl`.

## Testing Plan

Add unit tests for:

- Bone rename updates animation tracks without changing unrelated tracks.
- Bone rename updates nested `ModelNode` trees.
- Influence-row extraction and selected-bone pinning.
- Weight normalization, pruning, and four-influence limiting.
- Brush falloff calculations.
- Add, subtract, paint, and smooth weight edits.
- UV layout extraction from BG3D geometry.
- UV island detection.
- UV move, rotate, scale, flip, fit, and snap transforms.
- Zod validation for persisted tool settings.

Add focused React tests for:

- Animations card shows timeline when an animation is selected.
- Animations card shows rig tools when no animation is selected.
- Rename control calls the persistence callback and updates selected bone display.
- Texture detail dialog switches between Image, UV Map, and Assignments.

Manual verification:

- Load a BG3D with skeleton and animations.
- Rename a bone and confirm keyframe tracks, skeleton overlay selection, influence table, and export still work.
- Select no animation, enable selected-bone heatmap, paint weights, normalize, and confirm viewport updates.
- Open a texture popup, transform one UV island, confirm the viewport texture mapping updates, then export and reload.

## Implementation Steps

1. Move the Bone Tools card into `AnimationViewer` as a no-animation `RigToolsPanel`, keeping rename behavior behind a typed persistence callback.
2. Extract current bone influence summary logic from `ModelViewer.tsx` into pure helpers and add unit tests.
3. Add selected-bone rename controls to both selected-animation and no-animation states.
4. Add weight visualization state and viewport coloring without editing.
5. Add brush preview and raycast-based vertex selection in `ModelCanvas`.
6. Add weight brush editing for GLB/Three.js attributes, then wire persistence.
7. Extend `TextureItem` to open a tabbed texture detail dialog.
8. Add UV layout extraction and read-only UV overlay for selected textures.
9. Add UV selection and transform tools with immediate scene updates.
10. Wire UV persistence through BG3D parsed data and GLB regeneration.
11. Add tests for pure helpers first, then focused component tests for mode switching and dialogs.

## Risks and Decisions

- BG3D skeleton data may not support arbitrary blended weights the way glTF does. Avoid promising BG3D weight export until the skeleton binary format path is validated.
- Renaming bones touches scene objects, animation clips, parsed skeletons, and hierarchy nodes. It should be implemented as a single operation so partial updates cannot leave the UI in an inconsistent state.
- Weight painting can make meshes unusable if normalization is wrong. Default to normalize after every stroke and provide repair actions before exposing advanced controls.
- UV editing must preserve vertex order and triangle indices. Editing should mutate UV coordinates only, not geometry topology.
- The sidebar is already dense. Use tabs and collapsible sections inside the existing Animations and Texture Management cards rather than adding more top-level cards.
