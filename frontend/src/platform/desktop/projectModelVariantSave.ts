import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { assetImportResultSchema, projectAssetSchema, projectSnapshotSchema, type AssetImportResult, type ProjectFile, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { desktopRequest } from "./client";

export interface SavedModelVariant {
  imported: AssetImportResult;
  snapshot: ProjectSnapshot;
}

export async function saveProjectModelVariant(
  name: string,
  selected: string,
  exportFiles: (stem: string) => Promise<Result<ProjectFile[], string>>,
): Promise<Result<SavedModelVariant, string>> {
  const files = await exportFiles(`Assets/models/${name}`);
  if (files.isErr()) return err(files.error);
  const glb = files.value.find((file) => /\.glb$/i.test(file.path));
  if (!glb) return err("Export an editable GLB before saving a model variant");
  const assets = await desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema));
  if (assets.isErr()) return err(assets.error.message);
  const sourceAsset = assets.value.find((asset) => asset.outputs.files.includes(selected));
  const imported = await desktopRequest({ operation: "assets.import-buffer", name, bytes: glb.bytes, format: "glb", sourceAssetId: sourceAsset?.id }, assetImportResultSchema);
  if (imported.isErr()) return err(imported.error.message);
  const snapshot = await desktopRequest({ operation: "project.inspect" }, projectSnapshotSchema);
  return snapshot.isErr() ? err(snapshot.error.message) : ok({ imported: imported.value, snapshot: snapshot.value });
}

export async function acceptProjectModelVariant(imported: AssetImportResult): Promise<Result<SavedModelVariant, string>> {
  const accepted = await desktopRequest({ operation: "assets.accept", id: imported.asset.id, revision: imported.asset.revision }, projectAssetSchema);
  if (accepted.isErr()) return err(accepted.error.message);
  const snapshot = await desktopRequest({ operation: "project.inspect" }, projectSnapshotSchema);
  return snapshot.isErr() ? err(snapshot.error.message) : ok({ imported: { asset: accepted.value, needsReview: false, reasons: [] }, snapshot: snapshot.value });
}
