import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Group, Object3D } from "three";
import { ModelNode } from "./model-viewer/types";
import { HierarchyNodeItem } from "@/components/model-viewer/modelHierarchyTree";

interface ModelHierarchyProps {
  nodes: ModelNode[];
  clonedScene?: Group;
  onVisibilityChange: (nodeObject: Object3D, visible: boolean) => void;
}

export function ModelHierarchy({
  nodes,
  clonedScene,
  onVisibilityChange,
}: ModelHierarchyProps) {
  const [showAll, setShowAll] = useState(true);

  const handleToggleAll = () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    if (clonedScene) {
      clonedScene.children.forEach((child) => {
        onVisibilityChange(child, newShowAll);
      });
    }
  };

  if (nodes.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Model Hierarchy</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAll}
            className="text-xs text-gray-300 hover:text-white"
          >
            {showAll ? "Hide All" : "Show All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 pt-0 space-y-1 max-h-60 overflow-y-auto">
        {nodes.map((node) => {
          // Use the stored THREE object reference for proper matching
          // This avoids index mismatch issues when bones/joints are filtered out
          const nodeObject = node.threeObject;
          if (!nodeObject) {
            console.warn(`Node ${node.name} has no THREE object reference`);
            return null;
          }
          return (
            <HierarchyNodeItem
              key={`${node.name}-${node.nodeIndex}`}
              node={node}
              onVisibilityChange={onVisibilityChange}
              nodeObject={nodeObject}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
