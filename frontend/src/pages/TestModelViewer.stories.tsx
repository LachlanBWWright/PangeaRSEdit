import type { Meta, StoryObj } from "@storybook/react-vite";
import { TestModelViewer } from "./TestModelViewer";

const meta = {
  title: "Pages/Test Model Browser",
  component: TestModelViewer,
  parameters: { layout: "fullscreen" },
  tags: ["test", "smoke", "a11y", "visual", "overflow"],
} satisfies Meta<typeof TestModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectModel: Story = {};
