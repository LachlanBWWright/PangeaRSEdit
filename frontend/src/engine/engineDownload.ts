import type { Dispatch } from "react";
import { exportEnginePackage, validateEnginePackage, type EnginePackage } from "./enginePackage";
import { engineTypeFiles } from "./engineLanguage";
import type { EngineWorkspaceAction } from "./engineWorkspaceState";

export function downloadEnginePackage(packageData: EnginePackage, dispatch: Dispatch<EngineWorkspaceAction>) {
  const validation = validateEnginePackage(packageData);
  if (validation.isErr()) { dispatch({ type: "status", message: validation.error }); return false; }
  const generated = engineTypeFiles(packageData);
  const exported = exportEnginePackage({ files: [...packageData.files.filter((file) => !generated.some((type) => type.path === file.path)), ...generated] });
  dispatch(exported.isErr() ? { type: "status", message: exported.error } : { type: "saved" });
  return exported.isOk();
}
