import { act } from "react";
import { createRoot } from "react-dom/client";
import { createStore, Provider } from "jotai";
import { expect, it, vi } from "vitest";
import { Game } from "@/data/globals/globals";
import { installedEditorAssetsAtom, installedNativeGameDataAtom, useGameAssetAvailability } from "./assetAvailability";

vi.mock("./client", () => ({ desktopBridge: () => ({}) }));

function Availability() {
  const availability = useGameAssetAvailability(Game.OTTO_MATIC);
  return <p>{`${String(availability.levelsAvailable)} levels, ${String(availability.available)} previews`}</p>;
}

it("enables both levels and previews from original data or an existing editor pack", async () => {
  const store = createStore();
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Provider store={store}><Availability /></Provider>));
  expect(container.textContent).toBe("false levels, false previews");
  await act(async () => store.set(installedNativeGameDataAtom, ["OttoMatic"]));
  expect(container.textContent).toBe("true levels, true previews");
  await act(async () => {
    store.set(installedNativeGameDataAtom, []);
    store.set(installedEditorAssetsAtom, ["OttoMatic"]);
  });
  expect(container.textContent).toBe("true levels, true previews");
  await act(async () => store.set(installedEditorAssetsAtom, []));
  expect(container.textContent).toBe("false levels, false previews");
  await act(async () => root.unmount());
});
