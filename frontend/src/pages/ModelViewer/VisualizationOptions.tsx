import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Props {
  wireframeMode: boolean;
  setWireframeMode: (v: boolean) => void;
  showSkeleton: boolean;
  setShowSkeleton: (v: boolean) => void;
  logBonePositions: boolean;
  setLogBonePositions: (v: boolean) => void;
}

export function VisualizationOptions({
  wireframeMode,
  setWireframeMode,
  showSkeleton,
  setShowSkeleton,
  logBonePositions,
  setLogBonePositions,
}: Props) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Visualization Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="wireframe-mode"
            className="text-sm text-gray-300 cursor-pointer"
          >
            Wireframe Mode
          </label>
          <Switch
            id="wireframe-mode"
            checked={wireframeMode}
            onCheckedChange={setWireframeMode}
          />
        </div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="show-skeleton"
            className="text-sm text-gray-300 cursor-pointer"
          >
            Show Skeleton
          </label>
          <Switch
            id="show-skeleton"
            checked={showSkeleton}
            onCheckedChange={setShowSkeleton}
          />
        </div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="log-bone-positions"
            className="text-sm text-gray-300 cursor-pointer"
          >
            Log Bone Positions
          </label>
          <Switch
            id="log-bone-positions"
            checked={logBonePositions}
            onCheckedChange={setLogBonePositions}
          />
        </div>
        {logBonePositions && (
          <p className="text-xs text-gray-400 italic">
            Check console for bone position logs during animation playback
          </p>
        )}
      </CardContent>
    </Card>
  );
}
