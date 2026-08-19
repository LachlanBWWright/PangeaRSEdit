import type { Meta, StoryObj } from "@storybook/react-vite";
import { MenuEmptyState } from "./MenuEmptyState";

const meta = {
  title: "Editor/Shared/Menu Empty State",
  component: MenuEmptyState,
  parameters: { layout: "centered" },
  tags: ["autodocs", "test", "smoke", "a11y"],
  args: {
    title: "No tiles selected",
    description: "Choose a terrain region to start painting or editing.",
  },
} satisfies Meta<typeof MenuEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
    title: "No scripts",
    description: "Add a script to start building behaviors.",
  },
};

export const WithAction: Story = {
  args: {
    title: "Create new scene",
    description: "Start from a blank map or import a level archive.",
    actionLabel: "New map",
    onAction: () => undefined,
  },
};
