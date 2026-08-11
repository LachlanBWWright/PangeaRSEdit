import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function OverlayExamples() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-4">
        <Dialog>
          <DialogTrigger asChild><Button>Open settings</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Level settings</DialogTitle>
              <DialogDescription>Configure the current level.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild><Button>Done</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Popover>
          <PopoverTrigger asChild><Button variant="secondary">Quick actions</Button></PopoverTrigger>
          <PopoverContent>Duplicate or export this level.</PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline">Help</Button></TooltipTrigger>
          <TooltipContent>Shows editor keyboard shortcuts.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

const meta = {
  title: "UI/Overlays",
  component: OverlayExamples,
  parameters: { layout: "centered" },
} satisfies Meta<typeof OverlayExamples>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open settings" }));
    const body = within(document.body);
    await expect(body.getByRole("dialog", { name: "Level settings" })).toBeVisible();
    await userEvent.click(body.getByRole("button", { name: "Done" }));
    await expect(body.queryByRole("dialog", { name: "Level settings" })).not.toBeInTheDocument();
  },
};

export const PopoverInteraction: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Quick actions" }));
    await expect(within(document.body).getByText("Duplicate or export this level.")).toBeVisible();
  },
};

export const TooltipInteraction: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "Help" }));
    await expect(within(document.body).getByRole("tooltip")).toHaveTextContent("Shows editor keyboard shortcuts.");
  },
};
