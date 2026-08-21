import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemAuditPage } from "./ItemAuditPage";

const meta = {
  title: "Pages/Item Model Audit",
  component: ItemAuditPage,
  parameters: { layout: "fullscreen" },
  tags: ["test", "smoke", "a11y", "visual", "overflow"],
} satisfies Meta<typeof ItemAuditPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstItem: Story = {};

export const NarrowLayout: Story = {
  parameters: { viewport: { defaultViewport: "tablet" } },
};
