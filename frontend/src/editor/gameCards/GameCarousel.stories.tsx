import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { err } from "neverthrow";
import { GameCarousel } from "./GameCarousel";
import { expect, fn, userEvent, within } from "storybook/test";
import { getFeatureFlags, setFeatureFlags } from "@/config/featureFlags";

const noOp = () => undefined;

const meta = {
  title: "Pages/Game Carousel",
  component: GameCarousel,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={["/"]}>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
  tags: ["autodocs", "test", "smoke", "a11y"],
  args: {
    showAllGames: true,
    handleOpenFile: noOp,
    handleParseLevelDataFile: async () => err("Storyboard-only stub"),
    setMapFile: noOp,
    setMapImagesFile: noOp,
    setMapImages: noOp,
    setTunnelData: noOp,
    setTunnelFileName: noOp,
    setTunnelLevelKind: noOp,
    onCreateBlankLevel: noOp,
    onCreateScriptItemDemoLevel: noOp,
  },
} satisfies Meta<typeof GameCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CompactWidth: Story = {
  render: (args) => (
    <div className="w-[360px] border border-slate-700 bg-slate-950 p-2">
      <GameCarousel {...args} />
    </div>
  ),
};

export const ScriptingSampleLevels: Story = {
  args: { onOpenScriptingSample: fn() },
  beforeEach: () => {
    const previous = getFeatureFlags();
    setFeatureFlags({ ...previous, sampleScriptingLevels: true }).match(() => undefined, () => undefined);
    return () => { setFeatureFlags(previous).match(() => undefined, () => undefined); };
  },
  play: async ({ canvasElement, args }) => {
    const sample = within(canvasElement).getByRole("button", { name: /Earth Farm — Brain Alien spawner/ });
    await expect(sample).toBeVisible();
    await userEvent.click(sample);
    await expect(args.onOpenScriptingSample).toHaveBeenCalledWith(expect.objectContaining({ id: "otto-earth-farm-brain-port" }));
  },
};

export const OtherGameScriptingSamples: Story = {
  ...ScriptingSampleLevels,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    for (const title of ["Training — Ant alarm", "Garden — Platform checkpoint course", "Valley — Nest defence", "Forest — Aerial interception", "Desert — Branching bonus gates", "Swamp Shootout — Reactive gallery", "Prehistoric Plaza — Factory lockdown"]) {
      await expect(canvas.getByRole("button", { name: new RegExp(title) })).toBeInTheDocument();
    }
    await userEvent.click(canvas.getByRole("button", { name: /Training — Ant alarm/ }));
    await expect(args.onOpenScriptingSample).toHaveBeenCalledWith(expect.objectContaining({ id: "bugdom-alarm" }));
  },
};
