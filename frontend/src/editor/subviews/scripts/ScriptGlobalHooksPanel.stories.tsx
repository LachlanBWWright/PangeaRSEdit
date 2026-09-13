import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bugdom2Globals } from "@/data/globals/globals";
import { ScriptGlobalHooksPanel } from "./ScriptGlobalHooksPanel";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
} from "./scriptWorkspaceState";
import { getScriptBehaviorOptions } from "./scriptWorkspaceSelectors";

const meta = {
  title: "Scripts/Global Hooks Panel",
  component: ScriptGlobalHooksPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <Story />
      </div>
    ),
  ],
  tags: ["test", "a11y", "visual", "overflow"],
} satisfies Meta<typeof ScriptGlobalHooksPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const context = createScriptWorkspaceContext(Bugdom2Globals, 3);
const workspace = loadScriptSample(context, "hover-beacon");
const hookIds = context.supportedHooks.slice(0, 4);

export const ContractOverview: Story = {
  args: {
    supportedHooks: hookIds,
    globalHooks: hookIds.slice(0, 2).map((hookId, index) => ({
      hookId,
      behaviorId: workspace.behaviorCatalog[index]?.id ?? "custom.behavior",
      sourceFilePath: `Data/Scripts/src/hooks/${hookId}.lua`,
      compatibility: index === 0 ? "preview-ready" : "needs-review",
    })),
    getBehaviorOptionsForHook: (hookId) =>
      getScriptBehaviorOptions(workspace, "global", hookId).map((behavior) => ({
        id: behavior.id,
        label: behavior.label,
      })),
    onCreateScriptForHook: fn(),
    onClearHook: fn(),
    onAssignHook: fn(),
  },
};
