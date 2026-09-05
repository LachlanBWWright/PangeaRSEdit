import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { LevelActionMenu } from "@/editor/LevelActionMenu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  editorNavbarActionsAtom,
  editorNavbarLeftAtom,
  editorNavbarOpenAtom,
  editorNavbarTabsAtom,
} from "@/data/globals/editorNavbarAtoms";

export type TunnelEditorTab =
  | "items"
  | "sections"
  | "spline"
  | "textures"
  | "validation";

interface TunnelEditorNavbarProps {
  activeTab: TunnelEditorTab;
  onTabChange: (tab: TunnelEditorTab) => void;
  onClose: () => void;
  onPreview: () => void;
  onSave: () => void;
}

export function TunnelEditorNavbar({
  activeTab,
  onTabChange,
  onClose,
  onPreview,
  onSave,
}: TunnelEditorNavbarProps) {
  const setNavbarOpen = useSetAtom(editorNavbarOpenAtom);
  const setNavbarLeft = useSetAtom(editorNavbarLeftAtom);
  const setNavbarActions = useSetAtom(editorNavbarActionsAtom);
  const setNavbarTabs = useSetAtom(editorNavbarTabsAtom);

  useEffect(() => {
    setNavbarOpen(true);
    setNavbarLeft(
      <Button type="button" size="sm" variant="outline" onClick={onClose}>
        ← Back
      </Button>,
    );
    setNavbarTabs(
      <Tabs
        className="min-w-0 flex-1"
        value={activeTab}
        onValueChange={(value) => {
          if (
            value === "items" ||
            value === "sections" ||
            value === "spline" ||
            value === "textures" ||
            value === "validation"
          ) {
            onTabChange(value);
          }
        }}
      >
        <TabsList className="grid w-full grid-flow-col auto-cols-fr overflow-clip">
          <TabsTrigger className="w-full" value="items">Items</TabsTrigger>
          <TabsTrigger className="w-full" value="spline">Spline</TabsTrigger>
          <TabsTrigger className="w-full" value="sections">Sections</TabsTrigger>
          <TabsTrigger className="w-full" value="textures">Textures</TabsTrigger>
          <TabsTrigger className="w-full" value="validation">Validation</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    setNavbarActions(
      <LevelActionMenu
        canPreviewInGame
        canSaveToCloud={false}
        onPreviewInGame={onPreview}
        onDownload={onSave}
        onSaveToCloud={() => undefined}
      />,
    );

    return () => {
      setNavbarOpen(false);
      setNavbarLeft(null);
      setNavbarActions(null);
      setNavbarTabs(null);
    };
  }, [
    activeTab,
    onClose,
    onPreview,
    onSave,
    onTabChange,
    setNavbarActions,
    setNavbarLeft,
    setNavbarOpen,
    setNavbarTabs,
  ]);

  return null;
}
