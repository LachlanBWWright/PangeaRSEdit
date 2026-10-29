import { projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { desktopRequest } from "./client";

export async function copyProject(project: ProjectSnapshot, setProject: (project: ProjectSnapshot) => void) {
  const result = await desktopRequest({ operation: "project.copy", revision: project.revision }, projectSnapshotSchema);
  if (result.isErr()) { if (result.error.code !== "cancelled") toast.error(result.error.message); }
  else { setProject(result.value); toast.success("Project saved to the new folder"); }
}
