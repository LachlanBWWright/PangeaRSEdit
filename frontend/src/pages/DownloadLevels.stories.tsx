import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { DownloadLevels } from "./DownloadLevels";

function DownloadLevelsStory() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <DownloadLevels />
    </div>
  );
}

const meta = {
  title: "Pages/Custom Levels",
  component: DownloadLevelsStory,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/download-levels"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ["test", "smoke", "a11y", "visual", "overflow"],
} satisfies Meta<typeof DownloadLevelsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowLayout: Story = {
  parameters: { viewport: { defaultViewport: "phone" } },
};
