import type { IRetryPolicy, RetryContext } from "@microsoft/signalr";

const RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000] as const;

export class MultiplayerReconnectPolicy implements IRetryPolicy {
  nextRetryDelayInMilliseconds(context: RetryContext): number {
    const delayIndex = Math.min(
      context.previousRetryCount,
      RECONNECT_DELAYS_MS.length - 1,
    );
    return RECONNECT_DELAYS_MS[delayIndex] ?? 30_000;
  }
}
