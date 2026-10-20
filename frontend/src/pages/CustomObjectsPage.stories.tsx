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
    await userEvent.click(canvas.getByRole("combobox", { name: "Game model" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Checkpoint" }));
    await waitFor(() => expect(canvasElement.querySelector(".object-model-thumbnail"), canvasElement.textContent ?? "Object library").not.toBeNull(), { timeout: 8_000 });
    const firstSnapshot = canvasElement.querySelector(".object-model-thumbnail")?.getAttribute("src");
    await userEvent.click(canvas.getByRole("combobox", { name: "Game model" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Exit Rocket" }));
    await waitFor(() => {
      const thumbnail = canvasElement.querySelector(".object-model-thumbnail");
      expect(thumbnail).toHaveProperty("naturalWidth", 96);
      expect(thumbnail?.getAttribute("src")).not.toBe(firstSnapshot);
    }, { timeout: 30_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Collision" }));
    expect(canvasElement.querySelector(".object-model-thumbnail")).toHaveProperty("naturalWidth", 96);
  },
};

export const NanosaurDefinitions: Story = {
  args: { populated: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("Object name")).toHaveValue("Hover Beacon");
    await userEvent.click(canvas.getByRole("combobox", { name: "Appearance" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Uploaded 3DMF model" }));
    expect(canvas.getByLabelText("Upload model").getAttribute("accept")).toBe(".3dmf");
    expect(canvas.getByText(/Needed: Data\/Scripts\/assets\/models\/custom.3dmf/)).toBeVisible();
  },
};

export const NarrowLibrary: Story = {
  args: { populated: true },
  parameters: { viewport: { defaultViewport: "phone" } },
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
