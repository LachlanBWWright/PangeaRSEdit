import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { inspectorFixture } from "../../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { ScriptRuntimeMonitor } from "./ScriptRuntimeMonitor";
import type { PangeaScriptStatusJS } from "./utils/scriptRuntimeStatus";
import type { ScriptDiagnostics, ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { createStore, Provider } from "jotai";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "./viewEnum";
import { SelectedCustomPlacementAtom } from "./subviews/scripts/scriptPlacementSelectionState";
import { createScriptWorkspaceContext, loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "./subviews/scripts/scriptWorkspaceState";
import { err, ok, okAsync } from "neverthrow";
import type { ScriptObjectQuery } from "./utils/scriptInspector";

const manyObjects = Array.from({ length: 130 }, (_, index) => ({
  ...inspectorFixture.objects[0], id: index + 1, generation: 3,
  definition: index % 2 ? "" : "checkpoint-switch", type: "terrain-item",
})).flatMap((object) => {
  const base = inspectorFixture.objects[0];
  return base ? [{ ...base, ...object }] : [];
});

function queryManyObjects(query: ScriptObjectQuery) {
  const objects = query.scriptedOnly ? manyObjects.filter((object) => object.definition) : manyObjects;
  if (query.handle) {
    const found = manyObjects.filter((object) => object.id === query.handle?.id && object.generation === query.handle.generation);
    return found.length ? ok({ objects: found, offset: 0, nextOffset: null, total: 1, truncated: false, error: null }) : err("Object handle is stale");
  }
  const entries = objects.slice(query.offset, query.offset + 64);
  const next = query.offset + entries.length;
  return ok({ objects: entries, offset: query.offset, nextOffset: next < objects.length ? next : null, total: objects.length, truncated: next < objects.length, error: null });
}

const healthy: PangeaScriptStatusJS = {
  enabled: true, scriptsDisabled: false, configLoaded: true, bundleLoaded: true,
  activeScriptPath: "Data/Scripts/dist/main.lua", lastError: "", errorCount: 0,
  budgetExceededCount: 0, hooksCalledCount: 8, statusComplete: true,
};

const meta = {
  title: "Editor/Scripting runtime monitor", component: ScriptRuntimeMonitor,
  args: { status: healthy, previewError: null, files: [
    { path: "Data/Scripts/config", data: new Uint8Array() },
    { path: "Data/Scripts/dist/main.lua", data: new Uint8Array() },
  ] },
  decorators: [(Story) => <div className="h-[640px] bg-slate-950 p-4"><Story /></div>],
  tags: ["test", "interaction", "a11y"],
} satisfies Meta<typeof ScriptRuntimeMonitor>;
export default meta;
type Story = StoryObj<typeof meta>;

function inspectorFailure(kind: ScriptDiagnostics["lastFailure"]["kind"]): ScriptInspectorSnapshot {
  const diagnostics = inspectorFixture.runtime.diagnostics;
  const messages = {
    none: "", "callback-error": "attempt to index a nil value (field 'target')",
    "budget-exceeded": "aggregate frame instruction budget exceeded",
    "rejected-command": "setAnimation: animation index is unavailable",
  };
  return { ...inspectorFixture, runtime: { ...inspectorFixture.runtime,
    diagnostics: diagnostics ? { ...diagnostics, lastFailure: { ...diagnostics.lastFailure, kind, message: messages[kind] } } : undefined } };
}

export const SuccessfulHookDispatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toHaveTextContent("Runtime smoke check passed");
    expect(canvas.getByText("Verify gameplay behavior in the game.", { exact: false })).toBeVisible();
  },
};

export const RetainedBundleAfterFailedReload: Story = {
  args: { status: { ...healthy, errorCount: 1, hooksCalledCount: 908, lastError: "Data/Scripts/src/guard.lua:12: unexpected symbol near 'end'" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toHaveTextContent("Runtime check failed");
    expect(canvas.getByRole("status")).toHaveTextContent("A bundle remains loaded");
    expect(canvas.getByText(/unexpected symbol/)).toBeVisible();
    expect(canvas.queryByText("Runtime smoke check passed")).toBeNull();
  },
};

export const DisabledHost: Story = {
  args: { status: { ...healthy, scriptsDisabled: true, errorCount: 12 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toHaveTextContent("Scripts disabled");
    expect(canvas.queryByText("Runtime smoke check passed")).toBeNull();
  },
};

export const RecoveredWithSessionHistory: Story = {
  args: { status: { ...healthy, errorCount: 2, budgetExceededCount: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toHaveTextContent("Running after earlier errors");
    expect(canvas.getByText("Budget overruns this session")).toBeVisible();
    expect(canvas.queryByText("Runtime smoke check passed")).toBeNull();
  },
};

export const NewBundleWaitingForHookDispatch: Story = {
  args: { status: { ...healthy, hooksCalledCount: 0 } },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByRole("status")).toHaveTextContent("Waiting for hook dispatch");
  },
};

export const PreviewFailure: Story = {
  args: { status: null, previewError: "The runtime could not mount Data/Scripts/dist/main.lua" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toHaveTextContent("Runtime check failed");
    expect(canvas.getByText(/could not mount/)).toBeVisible();
  },
};

export const LiveObjectInspection: Story = {
  args: { inspector: inspectorFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("7", { exact: true })).toBeVisible();
    expect(canvas.getByText("[table]", { exact: true })).toBeVisible();
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Inspected script object" }), "2:1");
    expect(canvas.getByText("lifetime", { exact: true })).toBeVisible();
    expect(canvas.getByText("1:2", { exact: true })).toBeVisible();
    expect(canvas.queryByText("health", { exact: true })).toBeNull();
    const inspector = canvas.getByRole("region", { name: "Live script inspector" });
    expect(inspector.scrollWidth).toBeLessThanOrEqual(inspector.clientWidth);
  },
};

export const TruncatedObjectInspection: Story = {
  args: { inspector: { ...inspectorFixture, registeredObjects: 100, truncated: true } },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByText("Showing a bounded preview of 2 objects. Rebuild the runtime to browse all objects.")).toBeVisible();
  },
};

export const BrowseAllRegisteredObjects: Story = {
  args: { inspector: { ...inspectorFixture, objects: manyObjects.slice(0, 64), registeredObjects: manyObjects.length, truncated: true }, queryObjects: queryManyObjects },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("1–64 of 130")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(canvas.getByText("65–128 of 130")).toBeVisible());
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Inspected script object" }), "100:3");
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(canvas.getByText("129–130 of 130")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(canvas.getByRole("option", { name: "terrain-item · 100:3" })).toBeInTheDocument());
    await userEvent.click(canvas.getByRole("checkbox", { name: "Scripted objects only" }));
    await waitFor(() => expect(canvas.getByText("1–64 of 65")).toBeVisible());
    await userEvent.type(canvas.getByRole("textbox", { name: "Object handle" }), "130:3");
    await userEvent.click(canvas.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(canvas.getByRole("option", { name: "terrain-item · 130:3" })).toBeInTheDocument());
    expect(canvas.getByRole("combobox", { name: "Inspected script object" })).toHaveValue("130:3");
    await userEvent.clear(canvas.getByRole("textbox", { name: "Object handle" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Object handle" }), "130:2");
    await userEvent.click(canvas.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent("Object handle is stale"));
  },
};

export const CommandRejectionAndFrameAttribution: Story = {
  args: { inspector: inspectorFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const diagnostic = within(canvas.getByRole("region", { name: "Latest Lua diagnostic" }));
    expect(diagnostic.getByText("Command rejected", { exact: true })).toBeVisible();
    expect(diagnostic.getByText("Data/Scripts/dist/enemy.lua:18", { exact: true })).toBeVisible();
    expect(diagnostic.getByText("Object 1:2", { exact: true })).toBeVisible();
    expect(canvas.getByText("Rejected commands", { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByText(/^Current frame:/));
    expect(canvas.getByText("8,400 instructions", { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByText(/^Previous frame:/));
    expect(canvas.getByText("100 instructions without callback attribution.")).toBeVisible();
    expect(canvas.getByText("Attribution is limited to 32 entries; totals include all work.")).toBeVisible();
    expect(canvas.getByRole("status")).toHaveTextContent("Runtime smoke check passed");
  },
};

export const CallbackExceptionAttribution: Story = {
  args: { inspector: inspectorFailure("callback-error"), status: { ...healthy, errorCount: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("region", { name: "Latest Lua diagnostic" })).toHaveTextContent("Callback exception");
    expect(canvas.getByText("Data/Scripts/dist/enemy.lua:18", { exact: true })).toBeVisible();
  },
};

export const FrameBudgetAttribution: Story = {
  args: { inspector: inspectorFailure("budget-exceeded"), status: { ...healthy, errorCount: 1, budgetExceededCount: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("region", { name: "Latest Lua diagnostic" })).toHaveTextContent("Instruction budget exceeded");
    expect(within(canvas.getByRole("region", { name: "Latest Lua diagnostic" })).getByText("Object 1:2", { exact: true })).toBeVisible();
  },
};

const diagnosticWorkspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
const diagnosticPlacement = diagnosticWorkspace.levels["0"]?.customPlacements[0];
const diagnosticDefinition = diagnosticWorkspace.customObjects[0];
const diagnosticStore = createStore();
diagnosticStore.set(Globals, OttoGlobals);
diagnosticStore.set(LevelNumber, 0);
diagnosticStore.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, diagnosticWorkspace));

export const NavigateAuthoredPlacement: Story = {
  decorators: [(Story) => <Provider store={diagnosticStore}><Story /></Provider>],
  args: { inspector: { ...inspectorFixture, objects: inspectorFixture.objects.map((object, index) => index === 0 ? {
    ...object, definition: "", type: diagnosticDefinition?.id ?? "",
    state: { ...object.state, __pangeaPlacementId: diagnosticPlacement?.id ?? "", __pangeaPlacementLevel: "0" },
  } : object), runtime: { ...inspectorFixture.runtime, diagnostics: inspectorFixture.runtime.diagnostics ? {
    ...inspectorFixture.runtime.diagnostics, lastFailure: { ...inspectorFixture.runtime.diagnostics.lastFailure, source: diagnosticDefinition?.sourceFilePath ?? "", line: 2 },
  } : undefined } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const diagnostic = within(canvas.getByRole("region", { name: "Latest Lua diagnostic" }));
    expect(diagnostic.getByRole("button", { name: "Open Lua source" })).toBeEnabled();
    await userEvent.click(diagnostic.getByRole("button", { name: "Open Lua source" }));
    const body = within(canvasElement.ownerDocument.body);
    const editor = await body.findByRole("dialog", { name: "Lua diagnostic source" });
    expect(await within(editor).findByText(diagnosticDefinition?.sourceFilePath.replace("Data/Scripts/", "") ?? "", {}, { timeout: 10000 })).toBeVisible();
    await userEvent.click(within(editor).getByRole("button", { name: /^Close$/ }));
    await userEvent.click(await diagnostic.findByRole("button", { name: "Select placement on map" }));
    expect(diagnosticStore.get(SelectedCustomPlacementAtom)).toBe(diagnosticPlacement?.id);
    expect(diagnosticStore.get(ActiveView)).toBe(View.items);
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Inspected script object" }), "2:1");
    const inspector = within(canvas.getByRole("region", { name: "Live script inspector" }));
    expect(inspector.getAllByRole("button", { name: "Select placement on map" }).at(-1)).toBeDisabled();
    expect(inspector.getByText(/No authored placement identity/)).toBeVisible();
  },
};

export const NavigateAuthoredPlacementOnLaterPage: Story = {
  decorators: [(Story) => <Provider store={diagnosticStore}><Story /></Provider>],
  args: {
    inspector: { ...inspectorFixture, objects: manyObjects.slice(0, 64), registeredObjects: manyObjects.length, truncated: true },
    queryObjects: (query) => {
      const result = queryManyObjects(query);
      if (result.isErr()) return result;
      return okAsync({ ...result.value, objects: result.value.objects.map((object) => object.id === 100 ? {
        ...object, definition: "", type: diagnosticDefinition?.id ?? "",
        state: { ...object.state, __pangeaPlacementId: diagnosticPlacement?.id ?? "", __pangeaPlacementLevel: "0" },
      } : object) });
    },
  },
  play: async ({ canvasElement }) => {
    diagnosticStore.set(SelectedCustomPlacementAtom, null);
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("1–64 of 130")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(canvas.getByText("65–128 of 130")).toBeVisible());
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Inspected script object" }), "100:3");
    const inspector = within(canvas.getByRole("region", { name: "Live script inspector" }));
    const select = inspector.getAllByRole("button", { name: "Select placement on map" }).at(-1);
    expect(select).toBeEnabled();
    if (select) await userEvent.click(select);
    expect(diagnosticStore.get(SelectedCustomPlacementAtom)).toBe(diagnosticPlacement?.id);
    expect(canvas.getByText("Registered objects (130)")).toBeVisible();
  },
};
