import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Object3D } from "three";
import type { ModelNode } from "@/components/model-viewer/types";

interface HierarchyNodeItemProps {
  readonly node: ModelNode;
  readonly level?: number;
  readonly onVisibilityChange: (nodeObject: Object3D, visible: boolean) => void;
  readonly nodeObject: Object3D;
}

export function HierarchyNodeItem({
  node,
  level = 0,
  onVisibilityChange,
  nodeObject,
}: HierarchyNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const handleVisibilityToggle = () => {
    const nextVisible = !visible;
    setVisible(nextVisible);
    onVisibilityChange(nodeObject, nextVisible);
  };

  return (
    <div className="space-y-1">
      <div
        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors bg-gray-800"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-4 h-4 p-0 text-gray-300 hover:text-white"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        ) : (
          <div className="w-4" />
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-5 h-5 p-0 hover:bg-gray-600"
          onClick={handleVisibilityToggle}
          title={visible ? "Hide node" : "Show node"}
        >
          {visible ? (
            <Eye className="w-4 h-4 text-green-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-400" />
          )}
        </Button>

        <span
          className="text-sm flex-1 truncate text-white font-medium min-w-0"
          title={node.name}
        >
          {node.name}
        </span>

        <div className="flex items-center gap-1 flex-none">
          {node.polyCount !== undefined && (
            <span
              className="text-xs text-gray-500 tabular-nums"
              title={`${node.polyCount.toLocaleString()} triangles`}
              aria-label={`${node.polyCount.toLocaleString()} triangles`}
            >
              {node.polyCount.toLocaleString()}▾
            </span>
          )}
          <span className="text-xs text-gray-400 capitalize px-1 py-0.5 bg-gray-700 rounded">
            {node.type}
          </span>
        </div>
      </div>

      {hasChildren && expanded && node.children && (
        <div>
          {node.children.map((child) => {
            const childObject = child.threeObject;
            if (!childObject) {
              console.warn(
                `Child node ${child.name} has no THREE object reference`,
              );
              return null;
            }
            return (
              <HierarchyNodeItem
                key={`${child.name}-${child.nodeIndex}`}
                node={child}
                level={level + 1}
                onVisibilityChange={onVisibilityChange}
                nodeObject={childObject}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
