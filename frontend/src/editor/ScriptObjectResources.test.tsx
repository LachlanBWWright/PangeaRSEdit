import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import type { ScriptInspectorPage } from "@pangea/desktop-contracts";
import { afterEach, expect, it, vi } from "vitest";
import { ScriptObjectResources } from "./ScriptObjectResources";
import { ownedResources } from "./ScriptObjectResources.fixtures";
import type { QueryScriptObjects } from "./utils/scriptInspector";

let root: Root | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(query?: QueryScriptObjects) {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<ScriptObjectResources handle={{ id: 7, generation: 2 }} query={query} />));
  await act(async () => vi.advanceTimersByTimeAsync(1));
}

it("offers a clear rebuild path for an older runtime", async () => {
  await mount(() => ok({ objects: [{ id: 7, generation: 2, type: "checkpoint", definition: "checkpoint", controlled: true, enabled: true, owner: null, position: null, state: {} }], offset: 0, nextOffset: null, total: 1, truncated: false, error: null }));
  expect(document.body.textContent).toContain("Rebuild this game runtime");
});

it("shows exact-owner resource details and level-relative timing", async () => {
  await mount();
  await act(async () => root?.render(<ScriptObjectResources handle={{ id: 7, generation: 2 }} resources={ownedResources} />));
  expect(document.body.textContent).toContain("Timers (2)");
  expect(document.body.textContent).toContain("Every 5.00s · due in 3.00s");
  expect(document.body.textContent).toContain("sleeping · wakes in 2.00s");
  expect(document.body.textContent).toContain("checkpoint.open · Once");
  expect(document.body.textContent).toContain("objects/checkpoint.lua:28 · animate");
});

it("ignores an old generation's late reply and displays stale-handle failure", async () => {
  let finish: (result: Result<ScriptInspectorPage, string>) => void = () => undefined;
  const pending = new ResultAsync(new Promise<Result<ScriptInspectorPage, string>>((resolve) => { finish = resolve; }));
  const query: QueryScriptObjects = (request) => request.handle?.generation === 2 ? pending : err("invalid or stale object handle");
  await mount(query);
  await act(async () => root?.render(<ScriptObjectResources handle={{ id: 7, generation: 3 }} query={query} />));
  await act(async () => vi.advanceTimersByTimeAsync(1));
  await act(async () => finish(ok({ objects: [], offset: 0, nextOffset: null, total: 0, truncated: false, error: null })));
  expect(document.body.textContent).toContain("invalid or stale object handle");
  expect(document.body.textContent).not.toContain("no longer registered");
});
