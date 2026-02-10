import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimationClip } from "three";
import { createElement } from "react";
import { AnimationViewer } from "../../src/components/AnimationViewer";

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
    expect(markup).toContain("Animations (1)");
  });
});
