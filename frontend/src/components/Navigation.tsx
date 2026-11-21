import { NavLink, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Box, Boxes, ChevronDown, ClipboardList, Download, FlaskConical, Image, Map, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  editorNavbarLeftAtom,
  editorNavbarActionsAtom,
  editorNavbarOpenAtom,
  editorNavbarTabsAtom,
} from "@/data/globals/editorNavbarAtoms";
import { UserMenu } from "@/components/UserMenu";
import { useFeatureFlags } from "@/config/useFeatureFlags";
import { SettingsMenu } from "@/components/SettingsMenu";

export function Navigation() {
  const { pathname } = useLocation();
  const flags = useFeatureFlags();
  const editorNavbarOpen = useAtomValue(editorNavbarOpenAtom);
  const editorNavbarLeft = useAtomValue(editorNavbarLeftAtom);
  const editorNavbarActions = useAtomValue(editorNavbarActionsAtom);
  const editorNavbarTabs = useAtomValue(editorNavbarTabsAtom);
  const showEditorNavbar = pathname === "/" && editorNavbarOpen;
  const destinations = [
    { to: "/", label: "Level Editor", icon: Map, enabled: true },
    { to: "/model-viewer", label: "Model Viewer", icon: Box, enabled: true },
    { to: "/sprite-viewer", label: "Sprite Editor", icon: Image, enabled: true },
    { to: "/multiplayer", label: "Multiplayer", icon: Network, enabled: flags.multiplayer },
    { to: "/custom-objects", label: "Custom Objects", icon: Boxes, enabled: flags.scripting },
    { to: "/download-levels", label: "Custom Levels", icon: Download, enabled: true },
    { to: "/item-model-mapping-preview", label: "Item Models", icon: Boxes, enabled: flags.itemModelMappingPreview },
    { to: "/test-models", label: "Test Models", icon: FlaskConical, enabled: flags.itemModelMappingPreview },
    { to: "/item-audit", label: "Item Audit", icon: ClipboardList, enabled: flags.itemModelMappingPreview },
  ].filter(({ enabled }) => enabled);
  const current = destinations.find(({ to }) => to === pathname);

  return (
    <nav aria-label={showEditorNavbar ? "Editor toolbar" : "Main navigation"} className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-800 px-2 py-1 md:px-4">
      {showEditorNavbar ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {editorNavbarLeft && <div className="min-w-0 max-w-full flex-[1_1_9rem] xl:max-w-xs">{editorNavbarLeft}</div>}
          {editorNavbarTabs && (
            <div className="order-last flex min-w-0 basis-full overflow-x-auto rounded-md border border-border bg-muted p-1 text-muted-foreground xl:order-none xl:flex-1 [&_[role=tablist]]:min-w-max [&_[role=tablist]]:auto-cols-max">
              {editorNavbarTabs}
            </div>
          )}
          <div className="relative ml-auto flex min-w-0 flex-wrap items-center gap-2">{editorNavbarActions}</div>
        </div>
      ) : (
        <>
          <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 xl:flex">
            {destinations.map(({ to, label, icon: Icon }) => (
              <Button key={to} asChild variant={pathname === to ? "default" : "ghost"}>
                <NavLink to={to} end><Icon aria-hidden="true" />{label}</NavLink>
              </Button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1 xl:hidden">
            {current && <span className="truncate px-2 text-sm font-semibold" aria-current="page">{current.label}</span>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">More <ChevronDown aria-hidden="true" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {destinations.map(({ to, label, icon: Icon }) => (
                  <DropdownMenuItem key={to} asChild>
                    <NavLink to={to} end><Icon aria-hidden="true" className="size-4" />{label}</NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1"><SettingsMenu /><UserMenu /></div>
        </>
      )}
    </nav>
  );
}
