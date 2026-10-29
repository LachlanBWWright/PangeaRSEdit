import { describe, expect, it } from "vitest";
import { assetInstallationSchema, installationSchema } from "@pangea/desktop-contracts";
import { editorAssetGames, nativeDataGames } from "./editorAssetGames";

describe("complete editor asset availability", () => {
  it("keeps legacy packs available and does not mark raw upstream data as generated editor assets", () => {
    const legacy = assetInstallationSchema.parse({ game: "OttoMatic", version: "1", root: "/editor" });
    const upstream = assetInstallationSchema.parse({ game: "Bugdom", version: "1", root: "/raw", dataRoot: "/raw/Data", source: "upstream" });
    expect(editorAssetGames([legacy, upstream])).toEqual(["OttoMatic"]);
    expect(nativeDataGames([legacy, upstream])).toEqual(["Bugdom"]);
  });
  it("includes located and downloaded games without requiring a data download and deduplicates sources", () => {
    const game = installationSchema.parse({ game: "OttoMatic", version: "external", executable: "/game/OttoMatic",
      data: "/game/Data", managed: false, assetRootVersion: 2 });
    const stock = assetInstallationSchema.parse({ game: "OttoMatic", version: "1", root: "/stock", dataRoot: "/stock/Data", source: "upstream" });
    expect(nativeDataGames([], [game])).toEqual(["OttoMatic"]);
    expect(nativeDataGames([stock], [game])).toEqual(["OttoMatic"]);
    expect(editorAssetGames([stock])).toEqual([]);
  });
});
