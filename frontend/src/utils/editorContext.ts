import { triggerConversionDownload } from "@/components/conversionPanelActions";
import type { ModelNode } from "@/components/model-viewer/types";

interface ModelContextNode {
  readonly name: string;
  readonly type: ModelNode["type"];
  readonly visible: boolean;
  readonly meshIndex?: number;
  readonly nodeIndex?: number;
  readonly polyCount?: number;
  readonly children?: readonly ModelContextNode[];
}

type EditorContext =
  | {
      readonly kind: "level";
      readonly game: string;
      readonly previewLevelIndex: number;
      readonly dimensions: { readonly width: number; readonly height: number };
      readonly objectCounts: { readonly items: number; readonly fences: number; readonly splines: number };
    }
  | {
      readonly kind: "model";
      readonly name: string;
      readonly game: string | null;
      readonly sourceFormat: string | null;
      readonly selectedBone: string | null;
      readonly hierarchy: readonly ModelNode[];
      readonly animations: readonly { readonly name: string; readonly duration: number }[];
      readonly textureCount: number;
    };

function describeNode(node: ModelNode): ModelContextNode {
  return {
    name: node.name,
    type: node.type,
    visible: node.threeObject?.visible ?? node.visible,
    meshIndex: node.meshIndex,
    nodeIndex: node.nodeIndex,
    polyCount: node.polyCount,
    children: node.children?.map(describeNode),
  };
}

export function serializeEditorContext(context: EditorContext): string {
  const details = context.kind === "level" ? context : {
    ...context,
    hierarchy: context.hierarchy.map(describeNode),
    animations: context.animations.map(({ name, duration }) => ({ name, duration })),
  };
  return `${JSON.stringify({ schemaVersion: 1, ...details }, null, 2)}\n`;
}

export function downloadEditorContext(context: EditorContext): void {
  triggerConversionDownload(
    `pangea-${context.kind}-context.json`,
    "application/json",
    new TextEncoder().encode(serializeEditorContext(context)),
  );
}
