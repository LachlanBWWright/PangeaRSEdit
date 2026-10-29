import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";
import { nanosaur2CoverageScript } from "./nanosaur2Fixture";

async function marker(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "reload-probe");
}

async function nativePlayer(page: Page, player: number, field: number) {
  return page.evaluate(({ playerNum, stateField }) => window.Module?.ccall?.(
    "Nanosaur2Script_ReadPlayerCoverageJS", "number", ["number", "number"], [playerNum, stateField]),
  { playerNum: player, stateField: field });
}

async function nativeOperation(page: Page, operation: string, argumentsList: number[] = []) {
  return page.evaluate(({ name, arguments: values }) => {
    const module = window.Module;
    const readOtherPlayer = () => [0, 1, 2, 3, 4, 5, 6].map((field) => module?.ccall?.(
      "Nanosaur2Script_ReadPlayerCoverageJS", "number", ["number", "number"], [1, field]));
    const before = readOtherPlayer();
    const result = module?.ccall?.(name, "number", values.map(() => "number"), values);
    return { result, before, after: readOtherPlayer() };
  }, { name: operation, arguments: argumentsList });
}

const modes = [
  { name: "adventure", level: 0, players: 1 },
  { name: "race", level: 3, players: 2 },
  { name: "battle", level: 5, players: 2 },
  { name: "capture", level: 7, players: 2 },
];

for (const mode of modes) {
  test(`Nanosaur 2 ${mode.name}: native death/reset and pickups preserve callback parity and local player isolation`, async ({ page }) => {
    test.setTimeout(180_000);
    const base = reloadTargets.find((target) => target.name === "Nanosaur 2");
    expect(base).toBeDefined();
    if (!base) return;
    await launchReloadTarget(page, {
      ...base, level: mode.level,
      query: `level=${mode.level}&players=${mode.players}&deferStart=1`,
    });
    expect(await replaceRuntimeSource(page, nanosaur2CoverageScript(1, mode.players))).toBe(0);
    await expect.poll(async () => Number((await marker(page))?.state.frames)).toBeGreaterThan(5);
    expect(await nativePlayer(page, 0, 0)).toBeCloseTo(0.375, 5);
    if (mode.players === 2) expect(await nativePlayer(page, 1, 0)).toBeCloseTo(0.625, 5);
    const first = await marker(page);
    const secondIdentity = mode.players === 2 ? [await nativePlayer(page, 1, 4), await nativePlayer(page, 1, 5)] : [];
    for (const generation of [1, 2]) {
      if (generation === 2) {
        expect(await replaceRuntimeSource(page, nanosaur2CoverageScript(2, mode.players))).toBe(0);
        await expect.poll(async () => (await marker(page))?.state.generation).toBe("2");
        const next = await marker(page);
        expect(next && { id: next.id, generation: next.generation }).not.toEqual(first && { id: first.id, generation: first.generation });
        expect((await runtimeInspector(page))?.objects.some((object) => object.id === first?.id && object.generation === first.generation)).toBe(false);
      }
      for (const attempt of [1, 2]) {
        const death = await nativeOperation(page, "Nanosaur2Script_ProbeDeathRespawnJS");
        expect(death.result).toBe(1);
        expect(death.after).toEqual(death.before);
        await expect.poll(async () => (await marker(page))?.state).toMatchObject({ deaths: String(attempt), respawns: String(attempt), dead0: "false" });
        expect(await nativePlayer(page, 0, 3)).toBe(0);
        if (mode.players === 2) {
          expect(await nativePlayer(page, 1, 3)).toBe(0);
          expect(await nativePlayer(page, 1, 0)).toBeCloseTo(0.625, 5);
          expect([await nativePlayer(page, 1, 4), await nativePlayer(page, 1, 5)]).toEqual(secondIdentity);
        }
      }
      for (const [kind, id] of ["fuelPow", "shieldPow", "freeLifePow"].entries()) {
        const pickup = await nativeOperation(page, "Nanosaur2Script_ProbePowerupPickupJS", [kind]);
        expect(pickup.result).toBe(0);
        expect(pickup.after).toEqual(pickup.before);
        await expect.poll(async () => (await marker(page))?.state).toMatchObject({ pickups: String(kind + 1), pickupId: `nanosaur2.${id}` });
        if (mode.players === 2) expect(await nativePlayer(page, 1, 0)).toBeCloseTo(0.625, 5);
      }
    }
    const snapshot = await runtimeInspector(page);
    expect(snapshot?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
    expect(snapshot).toMatchObject({ callbackFailures: 0 });
    expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0 });
  });
}
