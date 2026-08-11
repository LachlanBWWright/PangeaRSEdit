import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

function LayoutComponents() {
  return (
    <div className="grid w-[42rem] gap-8">
      <Carousel aria-label="Game selection" className="mx-12" opts={{ loop: false }}>
        <CarouselContent className="h-32">
          {["Bugdom", "Otto Matic", "Nanosaur"].map((game) => (
            <CarouselItem key={game}>
              <div className="flex h-full items-center justify-center rounded border border-gray-700 text-xl">
                {game}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <ResizablePanelGroup orientation="horizontal" className="h-40 rounded border border-gray-700">
        <ResizablePanel defaultSize={40} minSize={20}>
          <div className="flex h-full items-center justify-center">Inspector</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={20}>
          <div className="flex h-full items-center justify-center">Canvas</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

const meta = {
  title: "UI/Layout",
  component: LayoutComponents,
  parameters: { layout: "centered" },
} satisfies Meta<typeof LayoutComponents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CarouselAndResizablePanels: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const carousel = canvas.getByRole("region", { name: "Game selection" });
    await expect(carousel).toBeVisible();
    const next = canvas.getByRole("button", { name: "Next slide" });
    await expect(next).toBeEnabled();
    await userEvent.click(next);
    await expect(canvas.getByRole("button", { name: "Previous slide" })).toBeEnabled();
    await expect(canvas.getByRole("separator")).toBeVisible();
  },
};
