import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    children: "Button",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Button" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
