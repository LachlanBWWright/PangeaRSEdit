import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { GamesPage } from "./GamesPage";
import { installDesktopStoryBridge } from "./desktopFixtures.stories.support";

const meta = {
  title: "Desktop/Games", component: GamesPage,
  parameters: { layout: "fullscreen" }, tags: ["test", "a11y", "visual", "interaction"],
  beforeEach: () => installDesktopStoryBridge(),
} satisfies Meta<typeof GamesPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InstalledAndAvailable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Check releases" }));
    await expect(canvas.getByRole("combobox", { name: "Game release" })).toHaveValue("v1.0.0");
    await expect(canvas.getByText(/Installed: v0.9.0/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: /^Play$/ })).toBeEnabled();
    await expect(canvas.getByText(/Download: 140 MiB/)).toBeVisible();
  },
};
export const Offline: Story = {
  beforeEach: () => installDesktopStoryBridge(true),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Check releases" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Installed games remain available offline");
    await expect(canvas.getByRole("button", { name: /^Play$/ })).toBeEnabled();
  },
};
