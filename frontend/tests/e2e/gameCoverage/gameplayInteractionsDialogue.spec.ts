import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";

async function dialogueState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "native-dialogue")?.state;
}

async function pressDialogueKey(page: Page, key: string) {
  const before = Number((await dialogueState(page))?.inputFrames);
  await page.keyboard.down(key);
  await expect.poll(async () => Number((await dialogueState(page))?.inputFrames), { timeout: 30_000 }).toBeGreaterThan(before + 1);
  await page.keyboard.up(key);
  const released = Number((await dialogueState(page))?.inputFrames);
  await expect.poll(async () => Number((await dialogueState(page))?.inputFrames), { timeout: 30_000 }).toBeGreaterThan(released + 1);
}

test("Otto native dialogue input selects a choice and stale cancellation cannot stop its replacement", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(dialogueSource))).toBe(0);
  await expect.poll(() => dialogueState(page), { timeout: 30_000 }).toMatchObject({ ready: "true" });
  await page.locator("#canvas").focus();
  await pressDialogueKey(page, "ArrowDown");
  await pressDialogueKey(page, "Enter");
  await expect.poll(() => dialogueState(page), { timeout: 30_000 }).toMatchObject({
    choice: "second", choices: "1", completions: "1", replacementActive: "true", staleRejected: "true",
  });
  await expect.poll(() => dialogueState(page), { timeout: 30_000 }).toMatchObject({ ready: "true" });
  await pressDialogueKey(page, "Enter");
  await expect.poll(() => dialogueState(page), { timeout: 30_000 }).toMatchObject({ completions: "2", complete: "true" });
  expect((await runtimeInspector(page))?.callbackFailures).toBe(0);
  expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, budgetExceeded: 0 });
});

const dialogueSource = `local pangea=require("pangea")
local entry={}
local marker, first, replacement
local choices, completions, frames, inputFrames, elapsed=0,0,0,0,0
function entry.onDialogueResult(ctx)
  assert(ctx.playerNum==0, "dialogue player mismatch")
  local state=pangea.object.state(marker)
  if ctx.reason=="choice" then
    assert(ctx.dialogueId=="coverage-choice", "unexpected choice source")
    choices=choices+1; state.choice=ctx.choiceId
  elseif ctx.reason=="complete" then
    completions=completions+1
  end
end
function entry.onFrame(ctx)
  local player=pangea.player.get(0)
  if not player then return end
  if not marker then
    marker=assert(pangea.spawn.scripted("reload-probe",player.position))
    assert(pangea.dialogue.define("coverage-choice",{{text="Choose a route",duration=0,choices={
      {id="first",text="First route",next=0},{id="second",text="Second route",next=0}
    }}}).ok)
    assert(pangea.dialogue.define("coverage-followup",{{text="Continue exploration",duration=0,next=0}}).ok)
    local started=pangea.dialogue.start("coverage-choice")
    assert(started.ok,"native dialogue unavailable")
    first=started.handle
  end
  local state=pangea.object.state(marker)
  state.coverage="native-dialogue"
  if completions==1 and not replacement then
    assert(not pangea.dialogue.isActive(first),"completed dialogue retained handle")
    local started=pangea.dialogue.start("coverage-followup")
    assert(started.ok,"replacement dialogue rejected")
    replacement=started.handle
    local stale=pangea.dialogue.cancel(first)
    state.staleRejected=not stale.ok and stale.reason=="stale-handle"
    state.replacementActive=pangea.dialogue.isActive(replacement)
    frames=0
    elapsed=0
  end
  frames=frames+1
  inputFrames=inputFrames+1; elapsed=elapsed+ctx.deltaSeconds
  state.inputFrames=inputFrames
  state.ready=frames>=30 and elapsed>=.3; state.choices=choices; state.completions=completions
  state.complete=completions==2 and not pangea.dialogue.isActive(replacement)
end
return entry
`;
