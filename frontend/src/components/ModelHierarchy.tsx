import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

interface ModelNode {
  name: string;
  type: 'mesh' | 'node' | 'group';
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
}

interface ModelHierarchyProps {
  nodes: ModelNode[];
  clonedScene: THREE.Group;
  onVisibilityChange: (nodeObject: THREE.Object3D, visible: boolean) => void;
}

function NodeItem({ 
  node, 
  level = 0, 
  onVisibilityChange,
  nodeObject,
}: { 
  node: ModelNode; 
  level?: number; 
  onVisibilityChange: (nodeObject: THREE.Object3D, visible: boolean) => void;
  nodeObject: THREE.Object3D;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const handleVisibilityToggle = () => {
    const newVisible = !nodeObject.visible;
    onVisibilityChange(nodeObject, newVisible);
  };

  return (
    <div className="space-y-1">
      <div 
        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors bg-gray-800"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="w-4 h-4 p-0 text-gray-300 hover:text-white"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 
              <ChevronDown className="w-3 h-3" /> : 
              <ChevronRight className="w-3 h-3" />
            }
          </Button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-5 h-5 p-0 hover:bg-gray-600"
          onClick={handleVisibilityToggle}
          title={nodeObject.visible ? "Hide node" : "Show node"}
        >
          {nodeObject.visible ? 
            <Eye className="w-4 h-4 text-green-400" /> : 
            <EyeOff className="w-4 h-4 text-red-400" />
          }
        </Button>
        
        <span className="text-sm flex-1 truncate text-white font-medium" title={node.name}>
          {node.name}
        </span>
        
        <span className="text-xs text-gray-400 capitalize px-2 py-1 bg-gray-700 rounded">
          {node.type}
        </span>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, index) => {
            const childObject = nodeObject.children[index];
            return (
              <NodeItem
                key={`${node.name}-${index}`}
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

export function ModelHierarchy({ nodes, clonedScene, onVisibilityChange }: ModelHierarchyProps) {
  const [showAll, setShowAll] = useState(true);

  const handleToggleAll = () => {
    // Toggle visibility for all top-level nodes
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    
    clonedScene.children.forEach((child) => {
      onVisibilityChange(child, newShowAll);
    });
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
      <CardContent className="pt-0 space-y-1 max-h-60 overflow-y-auto">
        {nodes.map((node, index) => {
          const nodeObject = clonedScene.children[index];
          if (!nodeObject) {
            console.warn(`No corresponding node object found for index ${index}`);
            return null;
          }
          return (
            <NodeItem
              key={index}
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