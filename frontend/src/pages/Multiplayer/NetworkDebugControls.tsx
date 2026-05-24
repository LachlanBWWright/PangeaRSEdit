import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { MultiplayerNetworkDebugOptions } from "@/multiplayer/runtimeBridge";

interface NetworkDebugControlsProps {
  readonly networkDebugOptions: MultiplayerNetworkDebugOptions;
  readonly onResetNetworkDebugOptions: () => void;
  readonly onUpdateNetworkDebugOption: (
    key: keyof MultiplayerNetworkDebugOptions,
    value: number,
  ) => void;
}

export function NetworkDebugControls({
  networkDebugOptions,
  onResetNetworkDebugOptions,
  onUpdateNetworkDebugOption,
}: NetworkDebugControlsProps) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-md border border-emerald-800 bg-black/90 p-3 text-sm text-emerald-100">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Network Impairment</div>
          <div className="text-xs text-emerald-300">
            Applies only in this browser while multiplayerDebug=1.
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onResetNetworkDebugOptions}
        >
          Reset
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="network-debug-latency">Artificial latency</Label>
            <span className="tabular-nums">
              {networkDebugOptions.latencyMs} ms
            </span>
          </div>
          <Slider
            id="network-debug-latency"
            min={0}
            max={1000}
            step={25}
            value={[networkDebugOptions.latencyMs]}
            onValueChange={(value) => {
              onUpdateNetworkDebugOption("latencyMs", value[0] ?? 0);
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="network-debug-loss">Packet loss</Label>
            <span className="tabular-nums">
              {networkDebugOptions.packetLossPercent}%
            </span>
          </div>
          <Slider
            id="network-debug-loss"
            min={0}
            max={100}
            step={1}
            value={[networkDebugOptions.packetLossPercent]}
            onValueChange={(value) => {
              onUpdateNetworkDebugOption("packetLossPercent", value[0] ?? 0);
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="network-debug-burst">Packet burst chance</Label>
            <span className="tabular-nums">
              {networkDebugOptions.packetBurstPercent}%
            </span>
          </div>
          <Slider
            id="network-debug-burst"
            min={0}
            max={100}
            step={1}
            value={[networkDebugOptions.packetBurstPercent]}
            onValueChange={(value) => {
              onUpdateNetworkDebugOption("packetBurstPercent", value[0] ?? 0);
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="network-debug-burst-size">
              Burst packet count
            </Label>
            <span className="tabular-nums">
              {networkDebugOptions.packetBurstSize}
            </span>
          </div>
          <Slider
            id="network-debug-burst-size"
            min={1}
            max={20}
            step={1}
            value={[networkDebugOptions.packetBurstSize]}
            onValueChange={(value) => {
              onUpdateNetworkDebugOption("packetBurstSize", value[0] ?? 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
