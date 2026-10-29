import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScriptPreviewExportPanel } from "./ScriptPreviewExportPanel";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { getScriptWorkspaceRevision } from "./scriptWorkflowEvidence";

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
      canvas.getByRole("button", { name: "Test with scripts" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Test without scripts" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Rebuild bundle" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Export extended level" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Export without scripts" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Export script package" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Import script package" }),
    );

    expect(args.onPreview).toHaveBeenNthCalledWith(1, true);
    expect(args.onPreview).toHaveBeenNthCalledWith(2, false);
    expect(args.onCompile).toHaveBeenCalledTimes(1);
    expect(args.onDownloadExtendedPackage).toHaveBeenCalledTimes(1);
    expect(args.onDownloadOriginalCompatible).toHaveBeenCalledTimes(1);
    expect(args.onDownloadScriptPackage).toHaveBeenCalledTimes(1);
    expect(args.onUploadScriptPackage).toHaveBeenCalledTimes(1);
  },
};

const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
const sourcePath = workspace.customObjects[0]?.sourceFilePath ?? "Data/Scripts/src/user.lua";

export const DraftValidationAndDiagnostic: Story = {
  args: {
    ...ExtendedWorkspace.args,
    workspace,
    evidence: { validatedRevision: "previous-draft", launchedRevision: getScriptWorkspaceRevision(workspace) },
    onOpenDiagnostic: fn(),
    diagnostics: [{ category: "source-validation", severity: "error", code: "lua.syntax", message: "Expected end before return", filePath: sourcePath, line: 17, column: 4 }],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Scripting draft changed since validation/)).toBeVisible();
    await expect(canvas.getByText(/Preview prepared for this scripting draft/)).toBeVisible();
    await expect(canvas.getByText(/Test with scripts automatically builds/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Open source location" }));
    await expect(args.onOpenDiagnostic).toHaveBeenCalledWith({ kind: "source", path: sourcePath, line: 17, column: 4 });
  },
};
