import { desktopBridge } from "./client";
import { DesktopProjectMenu } from "./DesktopProjectMenu";
import { useAtomValue } from "jotai";
import { desktopActiveDocumentAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";
import "./desktopTitleBar.css";

export function DesktopTitleBar() {
  const project = useAtomValue(desktopProjectAtom);
  const levelId = useAtomValue(desktopLevelIdAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const bridge = desktopBridge();
  if (!bridge) return null;
  const level = project?.manifest.levels.find((entry) => entry.id === levelId);
  const name = document?.kind === "level" ? level?.name ?? "New level" : document?.kind;
  return <header className="desktop-title-bar" data-platform={bridge.platform} aria-label="Application title bar">
    <div className="desktop-title-bar-actions"><DesktopProjectMenu /></div>
    <span className="pointer-events-none min-w-0 flex-1 truncate px-3 text-center text-xs font-medium text-slate-400">{name ? `${name}${dirty ? " •" : ""} — ` : ""}Pangea RS Edit</span>
  </header>;
}
