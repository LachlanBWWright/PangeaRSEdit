import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Globals, NanosaurGlobals, OttoGlobals } from "@/data/globals/globals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CustomObjectsPage } from "./CustomObjectsPage";
import { loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom, createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { createObjectDefinition } from "@/editor/subviews/scripts/scriptObjectActions";
import { buildScriptLibrary } from "@/editor/subviews/scripts/scriptLibrary";
import { buildScriptDefinitionBundle } from "@/editor/subviews/scripts/scriptDefinitionBundle";

function CustomObjectsPageStory({ populated = false }: { populated?: boolean }) {
  const [store] = useState(() => {
    const next = createStore();
    const globals = populated ? NanosaurGlobals : OttoGlobals;
    next.set(Globals, globals);
    if (populated) {
      const context = createScriptWorkspaceContext(globals, null);
      next.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, loadScriptSample(context, "hover-beacon")));
    }
    return next;
  });
  return <Provider store={store}><TooltipProvider><MemoryRouter><CustomObjectsPage /></MemoryRouter></TooltipProvider></Provider>;
}

const meta = {
  title: "Pages/Custom Objects", component: CustomObjectsPageStory,
  parameters: { layout: "fullscreen" }, tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof CustomObjectsPageStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GameLibrary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create your first object" }));
    const dialog = within(document.body).getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Object name"), "Checkpoint lantern");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create object" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Checkpoint lantern"));
    await userEvent.click(canvas.getByRole("button", { name: "Collision" }));
    await userEvent.click(canvas.getByRole("radio", { name: /Trigger An overlap/ }));
    expect(canvas.getByLabelText("Collision width")).toHaveValue(100);
    await userEvent.clear(canvas.getByLabelText("Collision width"));
    await userEvent.type(canvas.getByLabelText("Collision width"), "160");
    await userEvent.tab();
    expect(canvas.getByLabelText("Collision width")).toHaveValue(160);
    await userEvent.click(canvas.getByRole("button", { name: "Behavior" }));
    await waitFor(() => expect(canvasElement.querySelector(".monaco-editor")).toBeTruthy());
    await userEvent.click(canvas.getByText("Object events and cleanup"));
    const eventRow = canvas.getByText("onDestroy").closest("div");
    expect(eventRow?.parentElement).toBeTruthy();
    if (!eventRow?.parentElement) return;
    await userEvent.click(within(eventRow.parentElement).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Save source" })).toBeEnabled());
    await userEvent.click(canvas.getByRole("button", { name: "Save source" }));
    expect(canvas.getByRole("button", { name: "Save source" })).toBeDisabled();
  },
};

export const AutomaticModelPreview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create your first object" }));
    const dialog = within(document.body).getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Object name"), "Checkpoint lantern");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create object" }));
    await userEvent.click(canvas.getByRole("combobox", { name: "Appearance" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Game model" }));
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    let chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(await chooser.findByRole("button", { name: "Next models" }));
    await userEvent.click(chooser.getByRole("button", { name: "Next models" }));
    await userEvent.click(chooser.getByRole("button", { name: "Select Checkpoint" }));
    await userEvent.click(chooser.getByRole("button", { name: "Use Checkpoint" }));
    await waitFor(() => expect(canvasElement.querySelector(".object-model-thumbnail"), canvasElement.textContent ?? "Object library").not.toBeNull(), { timeout: 8_000 });
    const firstSnapshot = canvasElement.querySelector(".object-model-thumbnail")?.getAttribute("src");
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(await chooser.findByRole("button", { name: "Select Exit Rocket" }));
    await userEvent.click(chooser.getByRole("button", { name: "Use Exit Rocket" }));
    await waitFor(() => {
      const thumbnail = canvasElement.querySelector(".object-model-thumbnail");
      expect(thumbnail).toHaveProperty("naturalWidth", 96);
      expect(thumbnail?.getAttribute("src")).not.toBe(firstSnapshot);
    }, { timeout: 30_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Collision" }));
    expect(canvasElement.querySelector(".object-model-thumbnail")).toHaveProperty("naturalWidth", 96);
    await userEvent.click(canvas.getByRole("radio", { name: /Trigger An overlap/ }));
    expect(canvas.getByRole("region", { name: "Collision bounds preview" })).toBeVisible();
    expect(canvas.getByRole("img", { name: /Front.*100 by 100/ })).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText("Uploaded model collision preview").querySelector("canvas")).toBeVisible());
  },
};

export const NanosaurDefinitions: Story = {
  args: { populated: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("Object name")).toHaveValue("Hover Beacon");
    await userEvent.click(canvas.getByRole("combobox", { name: "Appearance" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Uploaded model" }));
    expect(canvas.getByLabelText("Upload model").getAttribute("accept")).toBe(".3dmf");
    await userEvent.click(canvas.getByText("Asset files"));
    expect(canvas.getByText(/Needed: Data\/Scripts\/assets\/models\/custom.3dmf/)).toBeVisible();
  },
};

export const NarrowLibrary: Story = {
  args: { populated: true },
  parameters: { viewport: { defaultViewport: "phone" } },
};

export const FullHeightLibrary: Story = {
  render: () => <div className="flex h-[1100px] min-h-0 flex-col bg-gray-900"><CustomObjectsPageStory /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sidebar = canvas.getByRole("complementary", { name: "Object library" });
    const page = canvas.getByRole("main");
    await expect(sidebar).toBeVisible();
    await expect(page.getBoundingClientRect().height).toBeGreaterThan(1000);
    const workspace = sidebar.parentElement;
    expect(workspace).not.toBeNull();
    if (workspace) await expect(Math.abs(sidebar.getBoundingClientRect().bottom - workspace.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
  },
};

export const DuplicateAndReviewImport: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null)), "Pack lantern", "blank");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const archive = buildScriptDefinitionBundle(created.value.state);
    expect(archive.isOk()).toBe(true);
    if (archive.isErr()) return;
    const bytes = new Uint8Array(archive.value.byteLength);
    bytes.set(archive.value);
    await userEvent.upload(canvas.getByLabelText("Import objects"), new File([bytes], "objects.zip", { type: "application/zip" }));
    let dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() => expect(dialog.getByText("No conflicting records found.")).toBeVisible());
    await userEvent.click(dialog.getByRole("button", { name: "Import objects" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Pack lantern"));
    await userEvent.click(canvas.getByText(/^Status:/));
    expect(canvas.getByText("Not validated", { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Duplicate object" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Pack lantern copy"));
    expect(canvas.queryByRole("checkbox", { name: "Select Pack lantern copy for export" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Export objects" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Pack lantern copy for export" }));
    expect(canvas.getByRole("button", { name: "Export selected (1)" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Done selecting" }));
    expect(canvas.queryByRole("checkbox", { name: "Select Pack lantern copy for export" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Export objects" }));
    expect(canvas.getByRole("checkbox", { name: "Select Pack lantern copy for export" })).toBeChecked();
    const updated = buildScriptDefinitionBundle({ ...created.value.state,
      customObjects: created.value.state.customObjects.map((object) => ({ ...object, label: "Updated lantern" })),
    });
    expect(updated.isOk()).toBe(true);
    if (updated.isErr()) return;
    const updatedBytes = new Uint8Array(updated.value.byteLength);
    updatedBytes.set(updated.value);
    await userEvent.upload(canvas.getByLabelText("Import objects"), new File([updatedBytes], "updated.zip", { type: "application/zip" }));
    dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() => expect(dialog.getByText(/existing records conflict/)).toBeVisible());
    await userEvent.click(dialog.getByRole("radio", { name: /^Replace/ }));
    await userEvent.click(dialog.getByRole("button", { name: "Import objects" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Updated lantern"));
    await userEvent.click(canvas.getByRole("button", { name: "Undo object import" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Pack lantern"));
    expect(canvas.getByRole("checkbox", { name: "Select Pack lantern copy for export" })).toBeChecked();
  },
};

export const SharedPackLibraryAndIdeUpdate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null)), "Pack lantern", "blank");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const definition = created.value.state.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const library = buildScriptLibrary(created.value.state);
    expect(library.isOk()).toBe(true);
    if (library.isErr()) return;
    const bytes = new Uint8Array(library.value.byteLength);
    bytes.set(library.value);
    await userEvent.click(canvas.getByText("Shared libraries and IDE workflow"));
    await userEvent.upload(canvas.getByLabelText("Import shared library"), new File([bytes], "pack-library.zip", { type: "application/zip" }));
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
    let dialog = within(within(document.body).getByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Apply selected changes" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Pack lantern"));
    const text = `-- edited in an IDE\nlocal behavior = {}\nreturn { ${definition.exportName} = behavior }`;
    const source = new File([text], "lantern.lua", { type: "text/plain" });
    Object.defineProperty(source, "webkitRelativePath", { value: `pack/${definition.sourceFilePath}` });
    await userEvent.upload(canvas.getByLabelText("Update Lua folder"), source);
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
    dialog = within(within(document.body).getByRole("dialog"));
    expect(dialog.getByRole("checkbox")).not.toBeChecked();
    await userEvent.click(dialog.getByRole("button", { name: "Use all incoming changes" }));
    await userEvent.click(dialog.getByRole("button", { name: "Apply selected changes" }));
    await userEvent.click(canvas.getByRole("button", { name: "Edit behavior" }));
    await waitFor(() => expect(canvasElement.querySelector(".view-lines")?.textContent).toMatch(/edited\s+in\s+an\s+IDE/));
    expect(canvas.getByRole("button", { name: "Save source" })).toBeDisabled();
  },
};
