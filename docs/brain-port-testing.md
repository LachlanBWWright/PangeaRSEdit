# Brain Port authoring acceptance test

Run from the repository root:

```sh
pnpm --dir frontend run test:scripting:brain-port
```

The existing scripting WASM launch matrix in `frontend-tests.yml` includes this
test and uploads its results as the `scripting-runtime-results` artifact, retained
for seven days. It needs the usual frontend dependencies, Playwright Chromium, the terrain
codec build and the generated Otto Matic WASM/data files. Use the repository's
normal game build workflow when those artifacts are absent or stale.

The test uses the production editor to load Earth Farm, create a blank Brain
Port definition, upload `level10_brainboss.bg3d`, select model object 5 at scale
3.5, edit Lua in Monaco, place the item through the Konva canvas, set its
coordinates to `(340, 0, 2150)` near the farm's player start and export a script
package. The Lua places the model on the sampled terrain height. It attaches that ZIP to the test report
so the authored example can be inspected or imported manually.

It reimports the downloaded ZIP through the production package API, checks the
definition and placement, then installs its generated files into the real Otto
runtime after stock data extraction. The engine runs Earth Farm (level 0), so
the model is tested outside the boss arena. Native inspector and console checks
page through all registered objects and verify three specifically marked Brain
Aliens, the custom object's instance state, absence of a
brain boss, and a healthy Lua host. It waits beyond the spawn quota, then uses
the runtime's object deletion API to verify destruction and alien cleanup.
Runtime diagnostics and failure traces are
retained in Playwright's output directory.

`frontend/src/editor/subviews/scripts/scriptOttoSpawner.lua` owns the production
starter's spawning logic, shared by the authoring test and Storybook. It deliberately
uses ordinary native Brain Aliens, keeping their native movement and combat;
the port itself only reuses a display model. It does not invoke `AddBrainPort`,
the boss's portal controller, or elite-alien boss logic. The three-spawn quota
and short interval keep this acceptance example deterministic; they are named
behavior settings, not engine limits.

The separate `sampleScriptingLevels.spec.ts` covers the playable sample's
continuous mode: total quota zero, at most three living aliens, a persistent
port, pausing outside spawn range, and replenishment on return within range.
It also checks that deleting an alien frees a spawn slot. The sample uses the
native port's draw slot so its transparent model draws before the aliens.
`sampleSpawnerRange.spec.ts` isolates the same checks without the editor. Its
driver moves the port relative to a script-controlled stationary player, so
native player physics cannot undo the distance change between timer ticks.

The package reimport and game launch use test plumbing rather than the preview
dialog. Existing Otto editor tests separately exercise that dialog. The authoring test
does not establish visual correctness from a screenshot, native combat parity,
or Electron asset availability.

The same command also runs `brainPortEncounter.spec.ts`: two placements exported
and reimported through the production package API use different spawn intervals
and restart/preserve checkpoint policies. The real engine resets the checkpoint,
then the test moves the player away and back to verify activation, fresh handles,
retained overrides and child cleanup. Deleting one port must leave the other
spawning independently. Final checks require no surviving port children, timers,
tasks, subscriptions or Lua errors.
