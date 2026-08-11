import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

function FormControls() {
  return (
    <div className="grid w-96 gap-5 rounded border border-gray-700 p-4">
      <div className="grid gap-2">
        <Label htmlFor="level-name">Level name</Label>
        <Input id="level-name" placeholder="Enter a level name" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Describe this level" />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox defaultChecked /> Show item markers
      </label>
      <label className="flex items-center justify-between gap-3">
        Enable snapping <Switch defaultChecked />
      </label>
      <div className="grid gap-2">
        <Label>Brush size</Label>
        <Slider aria-label="Brush size" defaultValue={[25]} max={100} step={5} />
      </div>
      <Select defaultValue="items">
        <SelectTrigger aria-label="Editor layer">
          <SelectValue placeholder="Choose a layer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="items">Items</SelectItem>
          <SelectItem value="fences">Fences</SelectItem>
          <SelectItem value="water">Water</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const meta = {
  title: "UI/Form Controls",
  component: FormControls,
  parameters: { layout: "centered" },
} satisfies Meta<typeof FormControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllControls: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByLabelText("Level name");
    await userEvent.type(nameInput, "Test level");
    await expect(nameInput).toHaveValue("Test level");

    const layerSelect = canvas.getByRole("combobox", { name: "Editor layer" });
    await userEvent.click(layerSelect);
    await userEvent.click(within(document.body).getByRole("option", { name: "Water" }));
    await expect(layerSelect).toHaveTextContent("Water");

    const notes = canvas.getByLabelText("Notes");
    await userEvent.type(notes, "Playable draft");
    await expect(notes).toHaveValue("Playable draft");

    const checkbox = canvas.getByRole("checkbox", { name: "Show item markers" });
    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();

    const snappingSwitch = canvas.getByRole("switch", { name: "Enable snapping" });
    await userEvent.click(snappingSwitch);
    await expect(snappingSwitch).not.toBeChecked();

    await expect(canvas.getByRole("slider", { name: "Brush size" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  },
};

export const InputEvents: Story = {
  render: () => <Input aria-label="Coordinate" onChange={fn()} />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Coordinate" });
    await userEvent.type(input, "128");
    await expect(input).toHaveValue("128");
  },
};

export const SliderKeyboardInteraction: Story = {
  render: () => (
    <Slider aria-label="Opacity" defaultValue={[25]} max={100} step={5} />
  ),
  play: async ({ canvasElement }) => {
    const slider = within(canvasElement).getByRole("slider", { name: "Opacity" });
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(slider).toHaveAttribute("aria-valuenow", "30");
  },
};
