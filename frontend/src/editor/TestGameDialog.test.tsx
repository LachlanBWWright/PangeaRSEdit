import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { Game } from "@/data/globals/globals";
import type { MultiplayerRuntimeEvent } from "./utils/gamePreviewRuntimeTypes";
import type { PangeaScriptStatusJS } from "./utils/scriptRuntimeStatus";
import { TestGameDialog } from "./TestGameDialog";

const healthy: PangeaScriptStatusJS = {
  enabled: true, scriptsDisabled: false, configLoaded: true, bundleLoaded: true,
  activeScriptPath: "Data/Scripts/dist/main.lua", lastError: "", errorCount: 0,
  budgetExceededCount: 0, hooksCalledCount: 1, statusComplete: true,
};
let currentStatus = healthy;
let root: Root | null = null;

vi.mock("./utils/scriptRuntimeStatus", async (importOriginal) => {
  const original = await importOriginal<typeof import("./utils/scriptRuntimeStatus")>();
  return { ...original, queryScriptingStatus: () => currentStatus };
});

vi.mock("./GamePreviewHost", () => ({
  GamePreviewHost: function PreviewHost({ onRuntimeEvent }: { onRuntimeEvent?: (event: MultiplayerRuntimeEvent) => void }) {
    useEffect(() => { onRuntimeEvent?.({ type: "runtimeInitialized" }); }, [onRuntimeEvent]);
    return null;
  },
}));

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  currentStatus = healthy;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function launchPreview() {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<TestGameDialog open onOpenChange={() => undefined}
    gameType={Game.OTTO_MATIC} levelNumber={0} onLevelNumberChange={() => undefined}
    terrainDataBytes={null} terrainRsrcBytes={null} terrainTextureBytes={null}
    customFiles={[{ path: "Data/Scripts/dist/main.lua", data: new Uint8Array() }]} />));
  const launch = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Launch Game");
  expect(launch).toBeDefined();
  await act(async () => launch?.click());
  await act(async () => vi.advanceTimersByTimeAsync(500));
}

it("does not let historical hook dispatches pass a failed reload, and replaces its diagnostic after recovery", async () => {
  currentStatus = { ...healthy, hooksCalledCount: 500, lastError: "candidate.lua:2: syntax error", errorCount: 1 };
  await launchPreview();
  expect(document.body.textContent).toContain("Runtime check failed");
  expect(document.body.textContent).toContain("candidate.lua:2: syntax error");
  expect(document.body.textContent).not.toContain("Runtime smoke check passed");

  currentStatus = { ...healthy, errorCount: 1, hooksCalledCount: 0 };
  await act(async () => vi.advanceTimersByTimeAsync(500));
  expect(document.body.textContent).toContain("Waiting for hook dispatch");
  expect(document.body.textContent).not.toContain("candidate.lua:2: syntax error");

  currentStatus = { ...healthy, errorCount: 1 };
  await act(async () => vi.advanceTimersByTimeAsync(500));
  expect(document.body.textContent).toContain("Running after earlier errors");
  expect(document.body.textContent).not.toContain("Runtime smoke check passed");
});

it("removes a previously passing smoke check when the host disables scripts", async () => {
  await launchPreview();
  expect(document.body.textContent).toContain("Runtime smoke check passed");
  currentStatus = { ...healthy, scriptsDisabled: true, errorCount: 10 };
  await act(async () => vi.advanceTimersByTimeAsync(500));
  expect(document.body.textContent).toContain("Scripts disabled");
  expect(document.body.textContent).not.toContain("Runtime smoke check passed");
});
