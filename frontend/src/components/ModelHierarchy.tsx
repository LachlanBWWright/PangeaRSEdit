import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onVisibilityChange: (nodeIndex: number, meshIndex: number | undefined, visible: boolean) => void;
}

function NodeItem({ 
  node, 
  level = 0, 
  onVisibilityChange,
  nodeIndex,
}: { 
  node: ModelNode; 
  level?: number; 
  onVisibilityChange: (nodeIndex: number, meshIndex: number | undefined, visible: boolean) => void;
  nodeIndex: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const handleVisibilityToggle = () => {
    onVisibilityChange(nodeIndex, node.meshIndex, !node.visible);
  };

  return (
    <div className="space-y-1">
      <div 
        className="flex items-center space-x-2 p-1 rounded hover:bg-gray-700 transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="w-4 h-4 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 
              <ChevronDown className="w-3 h-3" /> : 
              <ChevronRight className="w-3 h-3" />
            }
          </Button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <Checkbox
          checked={node.visible}
          onCheckedChange={handleVisibilityToggle}
          className="w-4 h-4"
        />
        
        <Button
          variant="ghost"
          size="sm"
          className="w-4 h-4 p-0"
          onClick={handleVisibilityToggle}
        >
          {node.visible ? 
            <Eye className="w-3 h-3 text-green-500" /> : 
            <EyeOff className="w-3 h-3 text-red-500" />
          }
        </Button>
        
        <span className="text-sm flex-1 truncate" title={node.name}>
          {node.name}
        </span>
        
        <span className="text-xs text-gray-400 capitalize">
          {node.type}
        </span>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, index) => (
            <NodeItem
              key={`${nodeIndex}-${index}`}
              node={child}
              level={level + 1}
              onVisibilityChange={onVisibilityChange}
              nodeIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelHierarchy({ nodes, onVisibilityChange }: ModelHierarchyProps) {
  const [expandAll, setExpandAll] = useState(true);

  const handleToggleAll = () => {
    // Toggle visibility for all nodes
    nodes.forEach((node, index) => {
      onVisibilityChange(index, node.meshIndex, !expandAll);
    });
    setExpandAll(!expandAll);
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
            className="text-xs"
          >
            {expandAll ? "Hide All" : "Show All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1 max-h-60 overflow-y-auto">
        {nodes.map((node, index) => (
          <NodeItem
            key={index}
            node={node}
            onVisibilityChange={onVisibilityChange}
            nodeIndex={index}
          />
        ))}
      </CardContent>
    </Card>
  );
}