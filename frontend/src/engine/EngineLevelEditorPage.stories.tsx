import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { EngineLevelEditorPage } from "@/pages/EngineLevelEditorPage";

const meta = { title: "Engine/Level editor", component: EngineLevelEditorPage, parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Provider><MemoryRouter><div style={{ display: "flex", height: "100vh" }}><Story /></div></MemoryRouter></Provider>],
} satisfies Meta<typeof EngineLevelEditorPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Foundation: Story = {};
export const EditHeightAndUndo: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.clear(canvas.getByLabelText("Sample height"));
  await userEvent.type(canvas.getByLabelText("Sample height"), "25");
  await expect(canvas.getByRole("button", { name: "Undo" })).toBeEnabled();
  await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
  await expect(canvas.getByRole("button", { name: "Redo" })).toBeEnabled();
} };
export const PlaceActor: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "Add actor" }));
  await expect(canvas.getByLabelText("Actor ID")).toHaveValue("actor1");
  await userEvent.clear(canvas.getByLabelText("Actor position X"));
  await userEvent.type(canvas.getByLabelText("Actor position X"), "250");
  await userEvent.click(canvas.getByLabelText("Physics body"));
  await userEvent.selectOptions(canvas.getByLabelText("Body movement"), "dynamic");
  await expect(canvas.getByLabelText("Body movement")).toHaveValue("dynamic");
  await expect(canvas.getByRole("button", { name: "Select actor actor1" })).toBeInTheDocument();
  await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
  await expect(canvas.getByLabelText("Body movement")).toHaveValue("static");
} };
