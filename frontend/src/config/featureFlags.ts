import { err, ok, Result } from "neverthrow";
import { z } from "zod";

export const ENABLE_SCRIPTS = true;

const FEATURE_FLAGS_STORAGE_KEY = "pangea-feature-flags";

const featureFlagsSchema = z.object({
  multiplayer: z.boolean(),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  multiplayer: import.meta.env.VITE_MULTIPLAYER_ENABLED === "true",
};

type FeatureFlagListener = () => void;

const listeners = new Set<FeatureFlagListener>();
let currentFlags = readStoredFeatureFlags();

function readStoredFeatureFlags(): FeatureFlags {
  const storedValueResult = Result.fromThrowable(
    () => window.localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY),
    () => undefined,
  )();

  if (storedValueResult.isErr() || storedValueResult.value === null) {
    return DEFAULT_FEATURE_FLAGS;
  }
  const storedValue = storedValueResult.value;

  const jsonResult = Result.fromThrowable(
    () => JSON.parse(storedValue),
    () => undefined,
  )();

  if (jsonResult.isErr()) return DEFAULT_FEATURE_FLAGS;

  const parsedFlags = featureFlagsSchema.safeParse(jsonResult.value);
  if (!parsedFlags.success) return DEFAULT_FEATURE_FLAGS;

  return DEFAULT_FEATURE_FLAGS.multiplayer
    ? { ...parsedFlags.data, multiplayer: true }
    : parsedFlags.data;
}

function notifyFeatureFlagListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getFeatureFlags(): FeatureFlags {
  return currentFlags;
}

export function subscribeToFeatureFlags(
  listener: FeatureFlagListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFeatureFlags(flags: FeatureFlags): Result<void, Error> {
  const validatedFlags = featureFlagsSchema.safeParse(flags);
  if (!validatedFlags.success) {
    return err(new Error("The feature flag settings are invalid."));
  }

  const saveResult = Result.fromThrowable(
    () =>
      window.localStorage.setItem(
        FEATURE_FLAGS_STORAGE_KEY,
        JSON.stringify(validatedFlags.data),
      ),
    () => new Error("Feature flags could not be saved in this browser."),
  )();

  if (saveResult.isErr()) return saveResult;

  currentFlags = validatedFlags.data;
  notifyFeatureFlagListeners();
  return ok(undefined);
}
