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

export const OriginalData: Story = {
  play: async ({ canvasElement }) => {
    const game = within(within(canvasElement).getByRole("region", { name: "Otto Matic" }));
    await expect(game.getByText(/Download stock levels and native game data/)).toBeVisible();
    await expect(game.queryByRole("combobox")).not.toBeInTheDocument();
    await expect(game.queryByRole("button", { name: "Download editor assets" })).not.toBeInTheDocument();
    await expect(game.getByRole("link", { name: "Jorio release and attribution" })).toHaveAttribute("href", "https://github.com/Jorio/OttoMatic/releases/tag/4.0.1");
    await userEvent.click(game.getByRole("button", { name: "Download original data" }));
    await expect(game.getByText("Stock data: 4.0.1 (Jorio original distribution)")).toBeVisible();
    await userEvent.click(game.getByRole("button", { name: "Remove stock data" }));
    await expect(game.getByText("Local game data available")).toBeVisible();
  },
};

export const OriginalDataRetry: Story = {
  beforeEach: () => installDesktopStoryBridge(false, "failure"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const game = within(canvas.getByRole("region", { name: "Otto Matic" }));
    await userEvent.click(game.getByRole("button", { name: "Download original data" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent("Original data download interrupted.");
    await userEvent.click(game.getByRole("button", { name: "Download original data" }));
    await expect(game.getByText("Stock data: 4.0.1 (Jorio original distribution)")).toBeVisible();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const OriginalDataCancel: Story = {
  beforeEach: () => installDesktopStoryBridge(false, "cancel"),
  play: async ({ canvasElement }) => {
    const game = within(within(canvasElement).getByRole("region", { name: "Otto Matic" }));
    await userEvent.click(game.getByRole("button", { name: "Download original data" }));
    await expect(game.getByRole("status")).toHaveTextContent("50% downloaded");
    await userEvent.click(game.getByRole("button", { name: "Cancel download" }));
    await expect(game.getByRole("button", { name: "Download original data" })).toBeEnabled();
    await expect(game.getByText("Local game data available")).toBeVisible();
  },
};

export const OriginalDataWhenEditorReleasesOffline: Story = {
  beforeEach: () => installDesktopStoryBridge(true),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Check releases" }));
    const game = within(canvas.getByRole("region", { name: "Otto Matic" }));
    await expect(game.getByRole("button", { name: "Download original data" })).toBeEnabled();
  },
};

export const LocateLocalGame: Story = {
  play: async ({ canvasElement }) => {
    const game = within(within(canvasElement).getByRole("region", { name: "Otto Matic" }));
    await userEvent.click(game.getByRole("button", { name: "Locate existing" }));
    await expect(game.getByText("Installed: external (external)")).toBeVisible();
    await expect(game.getByText("Local game data available")).toBeVisible();
    await expect(game.getByRole("button", { name: "Forget" })).toBeEnabled();
    await expect(game.getByRole("button", { name: "Download original data" })).toBeEnabled();
  },
};

export const ExistingEditorAssets: Story = {
  beforeEach: () => installDesktopStoryBridge(false, "success", true),
  play: async ({ canvasElement }) => {
    const game = within(within(canvasElement).getByRole("region", { name: "Otto Matic" }));
    await expect(game.getByText("Existing editor assets: v0.9.0")).toBeVisible();
    await expect(game.getByText(/Downloading original data replaces this existing editor asset pack/)).toBeVisible();
    await expect(game.queryByRole("button", { name: "Download editor assets" })).not.toBeInTheDocument();
    await userEvent.click(game.getByRole("button", { name: "Download original data" }));
    await expect(game.getByText("Stock data: 4.0.1 (Jorio original distribution)")).toBeVisible();
    await expect(game.queryByText(/Downloading original data replaces/)).not.toBeInTheDocument();
  },
};
