import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScriptPreviewExportPanel } from "./ScriptPreviewExportPanel";

const meta = {
  title: "Scripts/Preview and Export Panel",
  component: ScriptPreviewExportPanel,
  parameters: { layout: "fullscreen" },
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof ScriptPreviewExportPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExtendedWorkspace: Story = {
  args: {
    isPreparingPreview: false,
    onPreview: fn(),
    onCompile: fn(),
    onDownloadExtendedPackage: fn(),
    onDownloadOriginalCompatible: fn(),
    onDownloadScriptPackage: fn(),
    onUploadScriptPackage: fn(),
    statusLog: [
      "Loaded Bugdom 2 custom-object sample",
      "Compiled Lua bundle successfully",
      "Validated BG3D and skeleton assets",
    ],
    levelKey: "1",
    sourcePathOptions: [
      "Data/Scripts/src/main.lua",
      "Data/Scripts/src/objects/hover-beacon.lua",
    ],
    warnings: [
      "Native objective items remain native when a scripted replacement cannot take ownership.",
    ],
    hasScripts: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Preview with Scripts" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Compile Bundle" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Download Script Package" }),
    );

    expect(args.onPreview).toHaveBeenCalledWith(true);
    expect(args.onCompile).toHaveBeenCalledTimes(1);
    expect(args.onDownloadScriptPackage).toHaveBeenCalledTimes(1);
  },
};
