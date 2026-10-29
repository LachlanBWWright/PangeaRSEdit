import type { PortableAssets, ProjectAsset } from "@pangea/desktop-contracts";

export const importedAssetId = "11111111-1111-4111-8111-111111111111";
const revision = "22222222-2222-4222-8222-222222222222";
const folder = `Assets/Models/${importedAssetId}/${revision}`;
export const importedModelPath = `Data/Scripts/assets/project/${importedAssetId}/model.bg3d`;
export const importedAsset: ProjectAsset = {
  version: 1, id: importedAssetId, revision, game: "OttoMatic", name: "Robot",
  source: { mode: "managed", path: `AuthoringSources/${importedAssetId}/${revision}/robot.glb`, originalName: "robot.glb", format: "glb", dependencies: [], fingerprint: "hash" },
  outputs: { model: `${folder}/model.bg3d`, skeleton: null, preview: `${folder}/preview.glb`, files: [`${folder}/model.bg3d`, `${folder}/preview.glb`] },
  recipe: { scale: 1, rotation: [0, 0, 0] }, animations: [{ index: 0, name: "idle" }], warnings: [], previousRevision: null, importedAt: "2026-10-23T00:00:00Z",
};
export const importedAttachment: PortableAssets = { version: 1, assets: [importedAsset], warnings: [], files: [
  { path: importedAsset.source.path, bytes: new Uint8Array([7, 8]) },
  { path: importedAsset.outputs.model, bytes: new Uint8Array([1]) },
  { path: importedAsset.outputs.preview, bytes: new Uint8Array([2]) },
] };
