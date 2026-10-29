import { expect, type Page } from "@playwright/test";
import { replaceRuntimeSource } from "./runtimeReloadFixture";
import { runtimeInspector, runtimeObjectDefinition } from "./scriptRuntimeHealth";
import { routeRuntimeCallbacks } from "./runtimeScriptLifecycle";

const landingScript = routeRuntimeCallbacks(`local pangea = require("pangea")
local entry = {}
local marker
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  if not marker then marker=assert(pangea.spawn.scripted("reload-probe", player.position)) end
  pangea.object.state(marker).grounded=player.grounded
end
return entry
`);

export async function waitForOttoLanding(page: Page) {
  expect(await replaceRuntimeSource(page, landingScript)).toBe(0);
  await expect.poll(async () => (await runtimeInspector(page))?.objects
    .find((object) => runtimeObjectDefinition(object) === "reload-probe")?.state,
  { timeout: 90_000 }).toMatchObject({ grounded: "true" });
}
