import { desktopBridge } from "./client";
import { DesktopProjectMenu } from "./DesktopProjectMenu";
import "./desktopTitleBar.css";

export function DesktopTitleBar() {
  const bridge = desktopBridge();
  if (!bridge) return null;
  return <header className="desktop-title-bar" data-platform={bridge.platform} aria-label="Application title bar">
    <div className="desktop-title-bar-actions"><DesktopProjectMenu /></div>
    <span className="pointer-events-none absolute inset-x-0 text-center text-xs font-medium text-slate-400">Pangea RS Edit</span>
  </header>;
}
