import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onVisibilityChange: (nodePath: string, nodeIndex: number | undefined, meshIndex: number | undefined, visible: boolean) => void;
}

function NodeItem({ 
  node, 
  level = 0, 
  onVisibilityChange,
  nodePath,
}: { 
  node: ModelNode; 
  level?: number; 
  onVisibilityChange: (nodePath: string, nodeIndex: number | undefined, meshIndex: number | undefined, visible: boolean) => void;
  nodePath: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(node.visible);
  const hasChildren = node.children && node.children.length > 0;

  const handleVisibilityToggle = () => {
    const newVisible = !visible;
    setVisible(newVisible);
    onVisibilityChange(nodePath, node.nodeIndex, node.meshIndex, newVisible);
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
          title={visible ? "Hide node" : "Show node"}
        >
          {visible ? 
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
          {node.children!.map((child, index) => (
            <NodeItem
              key={`${nodePath}-${index}`}
              node={child}
              level={level + 1}
              onVisibilityChange={onVisibilityChange}
              nodePath={`${nodePath}-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelHierarchy({ nodes, onVisibilityChange }: ModelHierarchyProps) {
  const [showAll, setShowAll] = useState(true);

  const handleToggleAll = () => {
    // Toggle visibility for all top-level nodes
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    
    nodes.forEach((node, index) => {
      onVisibilityChange(`${index}`, node.nodeIndex, node.meshIndex, newShowAll);
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
        {nodes.map((node, index) => (
          <NodeItem
            key={index}
            node={node}
            onVisibilityChange={onVisibilityChange}
            nodePath={`${index}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}