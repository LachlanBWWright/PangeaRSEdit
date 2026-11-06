export function scriptStorageStatus({ desktop, projectOpen, projectDirty }: {
  desktop: boolean;
  projectOpen: boolean;
  projectDirty: boolean;
}): { label: string; detail: string } {
  if (!desktop) return {
    label: "Browser workspace",
    detail: "Changes stay in this browser workspace. Export a script package for a portable backup.",
  };
  if (!projectOpen) return {
    label: "No project open",
    detail: "Open a project to save files to disk.",
  };
  if (projectDirty) return {
    label: "Project unsaved",
    detail: "Use Save All to write project files to disk.",
  };
  return { label: "Project saved", detail: "Project files are saved to disk." };
}
