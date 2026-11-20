import { createStore } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom, desktopTransitionAtom } from "./projectState";
import { finishDocumentTransition, requestDocumentTransition, saveDocumentAndClose } from "./documentTransitions";

const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

function dirtyDocument() {
  const store = createStore();
  const discard = vi.fn();
  store.set(desktopProjectDirtyAtom, true);
  store.set(desktopActiveDocumentAtom, { kind: "level", save: async () => undefined, discard });
  window.pangeaDesktop = undefined;
  return { store, discard };
}

it("keeps the transition pending after a failed save and allows cancellation", async () => {
  const { store } = dirtyDocument();
  const transition = requestDocumentTransition(store);
  await finishDocumentTransition(store, "save");
  expect(store.get(desktopTransitionAtom)).not.toBeNull();
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  await finishDocumentTransition(store, "cancel");
  expect(await transition).toBe(false);
});

it("calls the document discard handler before allowing navigation", async () => {
  const { store, discard } = dirtyDocument();
  const transition = requestDocumentTransition(store);
  await finishDocumentTransition(store, "discard");
  expect(discard).toHaveBeenCalledOnce();
  expect(await transition).toBe(true);
  expect(store.get(desktopProjectDirtyAtom)).toBe(false);
});

it("waits for host dirty-state synchronization before permitting a close", async () => {
  const { store } = dirtyDocument();
  let confirm: (value: unknown) => void = () => undefined;
  const reply = new Promise<unknown>((resolve) => { confirm = resolve; });
  window.pangeaDesktop = { request: () => reply, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  store.set(desktopActiveDocumentAtom, { kind: "scripts", discard: () => undefined,
    save: async () => { store.set(desktopProjectDirtyAtom, false); } });
  const transition = requestDocumentTransition(store);
  const finishing = finishDocumentTransition(store, "save");
  expect(store.get(desktopTransitionAtom)).not.toBeNull();
  confirm({ ok: true, value: undefined });
  await finishing;
  expect(await transition).toBe(true);
});

it("rejects competing transitions without replacing the original request", async () => {
  const { store } = dirtyDocument();
  const first = requestDocumentTransition(store);
  expect(await requestDocumentTransition(store)).toBe(false);
  await finishDocumentTransition(store, "cancel");
  expect(await first).toBe(false);
});

it("does not close the window when Save and close fails to save", async () => {
  const { store } = dirtyDocument();
  const request = vi.fn(async () => ({ ok: true, value: undefined }));
  window.pangeaDesktop = { request, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  await saveDocumentAndClose(store);
  expect(request).not.toHaveBeenCalled();
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
});
