import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { GeneralEnginePage } from "@/pages/GeneralEnginePage";

const meta = {
  title: "Engine/Package workspace",
  component: GeneralEnginePage,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Provider><MemoryRouter><div style={{ height: "100vh", display: "flex" }}><Story /></div></MemoryRouter></Provider>],
} satisfies Meta<typeof GeneralEnginePage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Foundation: Story = {};
export const AddScene: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Scene ID"), "courtyard");
    await userEvent.type(canvas.getByLabelText("Display name"), "Courtyard");
    await userEvent.click(canvas.getByRole("button", { name: "Create scene + controller" }));
    await expect(canvas.getByRole("button", { name: "scenes/courtyard.lua" })).toHaveAttribute("aria-current", "true");
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("*");
  },
};
export const ManageSourceFiles: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByText("Manage files & assets"));
  await userEvent.type(canvas.getByLabelText("New source path"), "modules/encounters.lua");
  await userEvent.click(canvas.getByRole("button", { name: "Create source file" }));
  await expect(canvas.getByRole("button", { name: "modules/encounters.lua" })).toHaveAttribute("aria-current", "true");
  await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
  await expect(canvas.queryByRole("button", { name: "modules/encounters.lua" })).not.toBeInTheDocument();
} };
