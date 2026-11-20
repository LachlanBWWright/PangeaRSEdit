# Brain Port workflow UI review

The original review identified hierarchy and model selection improvements.
These findings come from production components mounted in Storybook with the
bundled Earth Farm terrain, its textures, the real Brain Port model and the same
Lua used by the runtime acceptance test. No replacement editor markup or fake
game-success state is used.

## Recommended improvements

1. **Implemented:** uploaded multi-object BG3D/3DMF files now offer selectable
   geometry thumbnails and a persistent model preview. Numeric model IDs remain
   in advanced details. The Appearance story verifies thumbnail pixels and
   selection against the real Brain Port model.
2. `frontend/src/editor/subviews/scripts/ScriptWorkflowStatus.tsx:15` and
   `CustomObjectWorkspace.tsx:98` — Global storage/validation explanations,
   definition scope and per-object readiness repeat and consume much of the
   first screen. Use a compact status row and expandable explanations, while
   keeping shared-definition scope explicit.
3. `frontend/src/editor/subviews/scripts/ScriptsMenu.tsx:63` — Build bundle,
   Rebuild bundle, Test level and Test with scripts compete across the toolbar
   and export screen. Promote one consistent Test action (it already validates),
   with build-only and export operations grouped as secondary actions. The
   Behavior tab and Edit behavior button similarly duplicate navigation.
4. `frontend/src/editor/subviews/items/CustomObjectItemPicker.tsx:103` — The
   placement inspector uses almost the full width for each coordinate and a
   bright full-width Delete Item button. A compact position group and secondary
   delete action would leave more room for the map and make editing more
   prominent than deletion. Preserve the existing native-style canvas gestures.

## Reproduce the screenshots

In Storybook, open **Workflows / Brain Port**. The stories cover Create Object,
Appearance, Behavior, Placement, and Test And Export. Appearance exercises the
model picker and preview. Screenshot capture scrolls the real inspector to the relevant
controls and pans the real map toward the farm player start.

```sh
pnpm --dir frontend exec vitest run --config vitest.storybook.config.ts src/storybook/BrainPortWorkflow.stories.tsx
pnpm --dir frontend exec playwright test --config playwright.storybook-screenshots.config.ts brainPortScreenshots.spec.ts
```

Images are generated under `frontend/screenshots/storybook/brain-port-*.png`.
Each story starts from the corresponding saved workflow state; these are
interaction-tested UI states, not an assertion that Storybook ran the game.
The separate `test:scripting:brain-port` Playwright test covers creation,
placement, package export/reimport, real native spawning and cleanup.

This review captures the browser UI. Electron project asset selection needs its
own project-backed fixtures; these screenshots do not establish that workflow.
