import { useEffect, useState } from "react";
import {
  getMultiplayerNetworkDebugOptions,
  getMultiplayerRuntimeDebugStats,
  setMultiplayerNetworkDebugOptions,
  type MultiplayerNetworkDebugOptions,
  type MultiplayerRuntimeDebugStats,
} from "@/multiplayer/runtimeBridge";
import {
  readNativeVisualDebugStats,
  type NativeVisualDebugStats,
} from "@/multiplayer/nativeVisualDebugStats";

export type NetworkDebugOptionKey = keyof MultiplayerNetworkDebugOptions;

interface MultiplayerDebugTelemetry {
  readonly runtimeDebugStats: MultiplayerRuntimeDebugStats;
  readonly nativeDebugStats: NativeVisualDebugStats;
  readonly networkDebugOptions: MultiplayerNetworkDebugOptions;
  readonly updateNetworkDebugOption: (
    key: NetworkDebugOptionKey,
    value: number,
  ) => void;
  readonly resetNetworkDebugOptions: () => void;
}

const disabledNetworkDebugOptions: MultiplayerNetworkDebugOptions = {
  latencyMs: 0,
  packetLossPercent: 0,
  packetBurstPercent: 0,
  packetBurstSize: 1,
};

export function useMultiplayerDebugTelemetry(
  enabled: boolean,
): MultiplayerDebugTelemetry {
  const [runtimeDebugStats, setRuntimeDebugStats] =
    useState<MultiplayerRuntimeDebugStats>(getMultiplayerRuntimeDebugStats);
  const [nativeDebugStats, setNativeDebugStats] =
    useState<NativeVisualDebugStats>(readNativeVisualDebugStats);
  const [networkDebugOptions, setNetworkDebugOptionsState] =
    useState<MultiplayerNetworkDebugOptions>(getMultiplayerNetworkDebugOptions);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setRuntimeDebugStats(getMultiplayerRuntimeDebugStats());
      setNativeDebugStats(readNativeVisualDebugStats());
    }, 500);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  const updateNetworkDebugOption = (
    key: NetworkDebugOptionKey,
    value: number,
  ): void => {
    const nextOptions = {
      ...getMultiplayerNetworkDebugOptions(),
      [key]: value,
    };
    setMultiplayerNetworkDebugOptions(nextOptions);
    setNetworkDebugOptionsState(getMultiplayerNetworkDebugOptions());
  };

  const resetNetworkDebugOptions = (): void => {
    setMultiplayerNetworkDebugOptions(disabledNetworkDebugOptions);
    setNetworkDebugOptionsState(getMultiplayerNetworkDebugOptions());
  };

  return {
    runtimeDebugStats,
    nativeDebugStats,
    networkDebugOptions,
    updateNetworkDebugOption,
    resetNetworkDebugOptions,
  };
}
