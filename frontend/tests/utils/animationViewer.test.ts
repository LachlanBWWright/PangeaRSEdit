import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimationClip } from "three";
import { createElement } from "react";
import { AnimationViewer, formatBoneLabel } from "../../src/components/AnimationViewer";

describe("AnimationViewer", () => {
  it("renders empty state when no animations exist", () => {
    const markup = renderToStaticMarkup(
      createElement(AnimationViewer, { animations: [], animationMixer: null }),
    );
    expect(markup).toContain("No animations found in this model");
  });

  it("renders editor controls when animations exist", () => {
    const clip = new AnimationClip("Walk", 1, []);
    const markup = renderToStaticMarkup(
      createElement(AnimationViewer, {
        animations: [{ name: "Walk", duration: 1, index: 0, clip }],
        animationMixer: null,
      }),
    );
    expect(markup).toContain("Create Animation");
    expect(markup).toContain("Edit Animation");
    expect(markup).toContain("Keyframe Editor");
    expect(markup).toContain("Animations (1)");
  });

  it("decodes hex-encoded bone labels", () => {
    const label = formatBoneLabel(
      "04486561643B003A0A5FEE50003300320069006D018600300015017700140034",
    );
    expect(label).toBe("Head");
  });
});
