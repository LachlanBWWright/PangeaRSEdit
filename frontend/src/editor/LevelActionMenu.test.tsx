import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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

    expect(markup).toContain("Download Level");
  });
});
