import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

function ToastExample() {
  return (
    <ToastProvider>
      <Toast defaultOpen duration={60_000}>
        <div className="grid gap-1">
          <ToastTitle>Level saved</ToastTitle>
          <ToastDescription>Your changes were written successfully.</ToastDescription>
        </div>
        <ToastAction altText="Undo level save">Undo</ToastAction>
        <ToastClose aria-label="Dismiss notification" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

const meta = {
  title: "UI/Toast",
  component: ToastExample,
} satisfies Meta<typeof ToastExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotificationInteraction: Story = {
  play: async () => {
    const body = within(document.body);
    await expect(body.getByText("Level saved")).toBeVisible();
    await expect(body.getByRole("button", { name: "Undo" })).toBeVisible();
    await userEvent.click(body.getByRole("button", { name: "Dismiss notification" }));
    await expect(body.queryByText("Level saved")).not.toBeInTheDocument();
  },
};
