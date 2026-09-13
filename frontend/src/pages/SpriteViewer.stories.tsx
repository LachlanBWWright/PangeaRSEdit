import type { Meta, StoryObj } from "@storybook/react-vite";
import { SpriteViewer } from "./SpriteViewer";

const meta = {
  title: "Pages/Sprite Editor",
  component: SpriteViewer,
  parameters: { layout: "fullscreen" },
  tags: ["test", "smoke", "a11y", "visual", "overflow"],
} satisfies Meta<typeof SpriteViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyWorkspace: Story = {};

export const NarrowLayout: Story = {
  parameters: { viewport: { defaultViewport: "tablet" } },
};
