import { useState } from "react";
import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ok } from "neverthrow";
import { GameModelSelector } from "./GameModelSelector";
import { MightyMikeAssetBrowser } from "@/pages/SpriteViewer/components/MightyMikeAssetBrowser";
import { installedEditorAssetsAtom, installedNativeGameDataAtom } from "@/platform/desktop/assetAvailability";

let store = createStore();

function BundledAssetStory({ editor }: { editor: "models" | "sprites" }) {
  const [type, setType] = useState<"sprites" | "tga" | "tileset">("sprites");
  return <Provider store={store}>{editor === "models"
    ? <GameModelSelector loading={false} onLoadModel={async () => ok(undefined)} />
    : <MightyMikeAssetBrowser selectedType={type} onTypeChange={setType} onAssetSelect={() => undefined} loading={false} />}</Provider>;
}

const meta = {
  title: "Editors/Bundled asset availability",
  component: BundledAssetStory,
  tags: ["test", "interaction"],
  beforeEach: () => {
    const original = window.pangeaDesktop;
    store = createStore();
    window.pangeaDesktop = { request: async () => ({ ok: true, value: null }),
      onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
    return () => { window.pangeaDesktop = original; };
  },
} satisfies Meta<typeof BundledAssetStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ModelGames: Story = {
  args: { editor: "models" },
  play: async ({ canvasElement }) => {
    store.set(installedEditorAssetsAtom, ["OttoMatic"]);
    await userEvent.click(within(canvasElement).getByRole("combobox", { name: "Game models game" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("option", { name: "Otto Matic" })).not.toHaveAttribute("aria-disabled", "true"));
    expect(body.getByRole("option", { name: "Bugdom 1 (Not downloaded)" })).toHaveAttribute("aria-disabled", "true");
    store.set(installedNativeGameDataAtom, ["Bugdom"]);
    await waitFor(() => expect(body.getByRole("option", { name: "Bugdom 1" })).not.toHaveAttribute("aria-disabled", "true"));
    await userEvent.click(body.getByRole("option", { name: "Bugdom 1" }));
    expect(within(canvasElement).getByRole("combobox", { name: "Game models game" })).toHaveTextContent("Bugdom 1");
    store.set(installedNativeGameDataAtom, []);
    await waitFor(() => expect(within(canvasElement).getByRole("combobox", { name: "Game models game" })).toHaveTextContent("Select a game"));
  },
};

export const SpriteAssets: Story = {
  args: { editor: "sprites" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Bundled sprite asset" }));
    const body = within(document.body);
    expect(body.getByRole("option", { name: "main" })).toHaveAttribute("aria-disabled", "true");
    store.set(installedNativeGameDataAtom, ["MightyMike"]);
    await waitFor(() => expect(body.getByRole("option", { name: "main" })).not.toHaveAttribute("aria-disabled", "true"));
    await userEvent.click(body.getByRole("option", { name: "main" }));
    expect(canvas.getByRole("combobox", { name: "Bundled sprite asset" })).toHaveTextContent("main");
    store.set(installedNativeGameDataAtom, []);
    await userEvent.click(canvas.getByRole("combobox", { name: "Bundled sprite asset type" }));
    expect(body.getByRole("option", { name: "Sprites (.shapes)" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const BrowserGames: Story = {
  args: { editor: "models" },
  beforeEach: () => { window.pangeaDesktop = undefined; },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("combobox", { name: "Game models game" }));
    const options = within(document.body).getAllByRole("option");
    expect(options).toHaveLength(7);
    for (const option of options) expect(option).not.toHaveAttribute("aria-disabled", "true");
  },
};
