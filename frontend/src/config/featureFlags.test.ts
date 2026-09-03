import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, featureFlagsSchema } from "./featureFlags";

describe("item model mapping preview feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.itemModelMappingPreview).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({ multiplayer: false, scripting: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.itemModelMappingPreview).toBe(false);
  });
});

describe("script item demo levels feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.scriptItemDemoLevels).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({
      multiplayer: false,
      scripting: false,
      itemModelMappingPreview: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scriptItemDemoLevels).toBe(false);
  });
});

describe("level validation feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.levelValidation).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({ multiplayer: false, scripting: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.levelValidation).toBe(false);
  });
});

describe("level output cache feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.levelOutputCache).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({
      multiplayer: false,
      scripting: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.levelOutputCache).toBe(false);
  });
});
