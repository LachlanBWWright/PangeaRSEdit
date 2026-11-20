import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { DesktopNavigationGuard } from "./DesktopNavigationGuard";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom } from "./projectState";

let root: Root | null = null;
const bridge = window.pangeaDesktop;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  window.pangeaDesktop = bridge;
  vi.unstubAllGlobals();
});

async function mountGuard() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }), onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  const store = createStore();
  const discard = vi.fn();
  store.set(desktopProjectDirtyAtom, true);
  store.set(desktopActiveDocumentAtom, { kind: "scripts", save: async () => undefined, discard });
  const router = createMemoryRouter([{ element: <><DesktopNavigationGuard /><Outlet /></>, children: [
    { path: "/", element: <Link to="/next">Next workspace</Link> },
    { path: "/next", element: <p>Next workspace</p> },
  ] }]);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Provider store={store}><RouterProvider router={router} /></Provider>));
  await act(async () => container.querySelector("a")?.click());
  return { store, discard, router };
}

async function clickButton(name: string) {
  const button = Array.from(document.querySelectorAll("button")).find((element) => element.textContent === name);
  expect(button).toBeDefined();
  await act(async () => button?.click());
}

it("calls the active document discard handler and completes a blocked route change", async () => {
  const { discard, router } = await mountGuard();
  expect(router.state.location.pathname).toBe("/");
  await clickButton("Discard and continue");
  expect(discard).toHaveBeenCalledOnce();
  expect(router.state.location.pathname).toBe("/next");
});

it("keeps a failed save blocked and lets the user return to editing", async () => {
  const { store, router } = await mountGuard();
  await clickButton("Save and continue");
  expect(router.state.location.pathname).toBe("/");
  expect(store.get(desktopProjectDirtyAtom)).toBe(true);
  await clickButton("Keep editing");
  expect(router.state.blockers.size).toBe(1);
  expect(router.state.location.pathname).toBe("/");
});
