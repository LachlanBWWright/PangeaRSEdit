import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModelViewer } from "./ModelViewer";

const meta = {
  title: "Pages/Model Viewer",
  component: ModelViewer,
  parameters: { layout: "fullscreen" },
  tags: ["test", "smoke", "a11y", "visual", "overflow"],
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UploadState: Story = {};

export const NarrowLayout: Story = {
  parameters: { viewport: { defaultViewport: "tablet" } },
};
