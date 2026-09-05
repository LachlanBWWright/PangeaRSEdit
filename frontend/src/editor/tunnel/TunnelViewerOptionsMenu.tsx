import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TunnelViewerOptionsMenuProps {
  showWater: boolean;
  showSpline: boolean;
  showItems: boolean;
  ghostTunnel: boolean;
  ghostOpacity: number;
  autoSnapToSelection: boolean;
  dragSensitivity: number;
  selectedItem: number | null;
  onShowWaterChange: (value: boolean) => void;
  onShowSplineChange: (value: boolean) => void;
  onShowItemsChange: (value: boolean) => void;
  onGhostTunnelChange: (value: boolean) => void;
  onGhostOpacityChange: (value: number) => void;
  onAutoSnapChange: (value: boolean) => void;
  onSnapCamera: () => void;
  onDragSensitivityChange: (value: number) => void;
}

export function TunnelViewerOptionsMenu({
  showWater,
  showSpline,
  showItems,
  ghostTunnel,
  ghostOpacity,
  autoSnapToSelection,
  dragSensitivity,
  selectedItem,
  onShowWaterChange,
  onShowSplineChange,
  onShowItemsChange,
  onGhostTunnelChange,
  onGhostOpacityChange,
  onAutoSnapChange,
  onSnapCamera,
  onDragSensitivityChange,
}: TunnelViewerOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="selectable" size="icon" aria-label="Viewer options" title="Viewer options">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-slate-800 text-white">
        <DropdownMenuLabel>Viewer options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-3 p-2">
          <ViewerToggle id="showWater" label="Water" checked={showWater} onChange={onShowWaterChange} />
          <ViewerToggle id="showSpline" label="Spline" checked={showSpline} onChange={onShowSplineChange} />
          <ViewerToggle id="showItems" label="Items" checked={showItems} onChange={onShowItemsChange} />
          <ViewerToggle id="ghostTunnel" label="Tunnel opacity" checked={ghostTunnel} onChange={onGhostTunnelChange} />
          <ViewerToggle id="autoSnapToSelection" label="Auto snap" checked={autoSnapToSelection} onChange={onAutoSnapChange} />
          {ghostTunnel && <ViewerSlider id="ghostOpacity" label="Opacity" value={ghostOpacity} min={0.15} max={0.95} step={0.05} onChange={onGhostOpacityChange} />}
          <ViewerSlider id="dragSensitivity" label="Drag speed" value={dragSensitivity} min={0.3} max={5} step={0.1} onChange={onDragSensitivityChange} />
          <Button type="button" size="sm" variant="outline" onClick={onSnapCamera} disabled={selectedItem === null}>Snap camera</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ViewerToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ViewerToggle({ id, label, checked, onChange }: ViewerToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm text-white">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </div>
  );
}

interface ViewerSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function ViewerSlider({ id, label, value, min, max, step, onChange }: ViewerSliderProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-gray-300">{label}</Label>
      <Slider id={id} min={min} max={max} step={step} value={[value]} onValueChange={([next]) => { if (next !== undefined) onChange(next); }} />
    </div>
  );
}
