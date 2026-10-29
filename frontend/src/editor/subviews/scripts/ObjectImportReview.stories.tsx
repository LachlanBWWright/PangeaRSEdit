import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { ObjectImportReview } from "./ObjectImportReview";
import { importedAsset, importedAttachment } from "./scriptObjectImport.fixtures";

const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
const meta = {
  title: "Editor/Scripting/Object import review",
  component: ObjectImportReview,
  args: {
    workspace,
    bundle: {
      gameId: workspace.context.gameId,
      definitions: workspace.customObjects,
      sources: Object.fromEntries(workspace.customObjects.map((object) => [object.sourceFilePath, `${workspace.sourceFiles[object.sourceFilePath]?.content ?? ""}\n-- Updated behavior`])),
      assets: {},
    },
    onImport: fn(),
    onCancel: fn(),
  },
  tags: ["test", "interaction", "a11y"],
} satisfies Meta<typeof ObjectImportReview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConflictingObject: Story = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = within(screen.getByRole("dialog", { name: "Review object import" }));
    await waitFor(() => expect(dialog.getByText("2 existing records conflict with this archive.")).toBeVisible());
    await expect(dialog.getByRole("radio", { name: /Keep existing/ })).toBeChecked();
    await userEvent.click(dialog.getByRole("radio", { name: /Import as copy/ }));
    await userEvent.click(dialog.getByRole("button", { name: "Import objects" }));
    await expect(args.onImport).toHaveBeenCalledWith("copy");
  },
};

export const EditableAssetConflict: Story = {
  args: { bundle: { ...meta.args.bundle, authoringAssets: importedAttachment }, projectAssets: [importedAsset] },
  play: async ({ canvasElement, args }) => {
    const dialog = within(within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Review object import" }));
    await waitFor(() => expect(dialog.getByText("Editable asset: Robot")).toBeVisible());
    await expect(dialog.getByText(/Included editable assets and authoring sources are restored/)).toBeVisible();
    await userEvent.click(dialog.getByRole("radio", { name: /Import as copy/ }));
    await userEvent.click(dialog.getByRole("button", { name: "Import objects" }));
    await expect(args.onImport).toHaveBeenCalledWith("copy");
  },
};

export const RestoringEditableAssets: Story = {
  args: { importing: true, bundle: { ...meta.args.bundle, authoringAssets: importedAttachment } },
  play: async ({ canvasElement }) => {
    const dialog = within(within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Review object import" }));
    await expect(dialog.getByRole("button", { name: "Importing…" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expect(dialog.getByRole("radio", { name: /Replace/ })).toBeDisabled();
  },
};
