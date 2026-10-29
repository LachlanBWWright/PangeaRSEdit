import type { GameId, UpstreamDataRelease } from "@pangea/desktop-contracts";

function release(game: GameId, version: string, tag: string, size: number, sha256: string, hotfix = false): UpstreamDataRelease {
  const repository = `Jorio/${game}`;
  const releaseUrl = `https://github.com/${repository}/releases/tag/${tag}`;
  const filename = `${game}-${version}-windows-x64${hotfix ? "-hotfix" : ""}.zip`;
  return { game, version, repository, tag, size, sha256, filename, dataPrefix: `${game}-${version}/Data`, releaseUrl,
    downloadUrl: `https://github.com/${repository}/releases/download/${tag}/${filename}` };
}

// Pin complete upstream archives so a replaced release asset cannot silently change stock data.
export function upstreamCatalog(): UpstreamDataRelease[] {
  return [
    release("OttoMatic", "4.0.1", "4.0.1", 150333604, "974a8cebcc25c6c691bdd8461b78a5410a74771c56a7b1c1234cae7da8f7cfa1"),
    release("Bugdom", "1.3.4", "1.3.4", 54571847, "ae75d5d6ad9a4557600cd4cb4d5c8518a3b8bae0bae27fa216e4936d5a7a727d"),
    release("Bugdom2", "4.0.0", "v4.0.0", 140902899, "055a318c6268139c01204164e9250670adf3f796bb8b27e020d96c3433d9d2ec"),
    release("Nanosaur", "1.4.4", "v1.4.4", 15194703, "5462fe111e207f8d2953533c4948081cfd01a0d189d47c8cd696d673d1624b13"),
    release("Nanosaur2", "2.1.0", "v2.1.0", 118060759, "3446e939557178fea458f76465cbc71311449aada19b08ebe58924b9f5447e85"),
    release("CroMagRally", "3.0.1", "3.0.1", 131554621, "94e6491d7d40ffe0e401096b126a370e3712036f73e5e0a2eb0ca9e13e6dac39"),
    release("BillyFrontier", "1.1.1", "v1.1.1", 86553299, "c574a4a1b928d6e85b9ef20ef544769489844d7e394182c00999fcb5c567ed36"),
    release("MightyMike", "3.0.2", "v3.0.2", 29296050, "20b6072fd02c3d9afc7a023ed4f4f896e7598d47b038228286b77f86460b04e2", true),
  ];
}
