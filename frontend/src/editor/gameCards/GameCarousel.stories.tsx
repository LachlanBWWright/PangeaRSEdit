import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { err } from "neverthrow";
import { GameCarousel } from "./GameCarousel";

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
    onCreateBlankLevel: noOp,
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
