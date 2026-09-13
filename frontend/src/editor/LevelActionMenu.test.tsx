import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getFeatureFlags, setFeatureFlags } from "@/config/featureFlags";
import { LevelActionMenu } from "./LevelActionMenu";

describe("LevelActionMenu", () => {
  it("always renders Download Level when optional actions are unavailable", () => {
    const markup = renderToStaticMarkup(
      <LevelActionMenu
        canPreviewInGame={false}
        canSaveToCloud={false}
        hasScripts={false}
        onPreviewInGame={vi.fn()}
        onDownload={vi.fn()}
        onSaveToCloud={vi.fn()}
      />,
    );

    expect(markup).toContain("Level Actions");
  });

  it("renders scripted preview when scripting is enabled", async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    const originalFlags = getFeatureFlags();
    const enableResult = setFeatureFlags({ ...originalFlags, scripting: true });
    expect(enableResult.isOk()).toBe(true);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <LevelActionMenu
          canPreviewInGame
          canSaveToCloud={false}
          hasScripts
          onPreviewInGame={vi.fn()}
          onPreviewWithScripts={vi.fn()}
          onPreviewFromMainMenu={vi.fn()}
          onPreviewFromMainMenuWithScripts={vi.fn()}
          onDownload={vi.fn()}
          onSaveToCloud={vi.fn()}
        />,
      );
    });

    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      );
    });

    const restoreResult = setFeatureFlags(originalFlags);
    expect(restoreResult.isOk()).toBe(true);
    expect(document.body.textContent).toContain("Preview in Game (scripts)");
    expect(document.body.textContent).toContain("Preview from Main Menu");
    expect(document.body.textContent).toContain(
      "Preview from Main Menu (scripts)",
    );
    root.unmount();
    container.remove();
  });
});
