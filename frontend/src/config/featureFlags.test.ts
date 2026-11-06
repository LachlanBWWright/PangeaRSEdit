import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, featureFlagsSchema } from "./featureFlags";

describe("sample scripting levels feature flag", () => {
  it("keeps playable samples hidden by default and migrates older settings", () => {
    expect(DEFAULT_FEATURE_FLAGS.sampleScriptingLevels).toBe(false);
    const result = featureFlagsSchema.safeParse({ scripting: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sampleScriptingLevels).toBe(false);
  });
});

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

describe("multiplayer debugging feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.multiplayerDebug).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({
      multiplayer: false,
      scripting: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.multiplayerDebug).toBe(false);
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

describe("level metadata feature flag", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_FEATURE_FLAGS.levelMetadata).toBe(false);
  });

  it("migrates stored flags that predate the setting", () => {
    const result = featureFlagsSchema.safeParse({ multiplayer: false, scripting: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.levelMetadata).toBe(false);
  });
});
