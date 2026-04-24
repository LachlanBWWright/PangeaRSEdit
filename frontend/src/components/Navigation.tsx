import { Link, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Map,
  Box,
  Download,
  Image,
  FlaskConical,
  Boxes,
  ClipboardList,
} from "lucide-react";
import {
  editorNavbarLeftAtom,
  editorNavbarActionsAtom,
  editorNavbarOpenAtom,
  editorNavbarTabsAtom,
} from "@/data/globals/editorNavbarAtoms";

export function Navigation() {
  const location = useLocation();
  const editorNavbarOpen = useAtomValue(editorNavbarOpenAtom);
  const editorNavbarLeft = useAtomValue(editorNavbarLeftAtom);
  const editorNavbarActions = useAtomValue(editorNavbarActionsAtom);
  const editorNavbarTabs = useAtomValue(editorNavbarTabsAtom);
  const showExperimentalLinks = false;
  const showEditorNavbar = location.pathname === "/" && editorNavbarOpen;

  return (
    <nav className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-2 md:px-4 py-1 min-h-14 flex items-center gap-2 md:gap-4 overflow-hidden">
      {showEditorNavbar ? (
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-2 md:gap-4 whitespace-nowrap w-full pr-1 overflow-hidden">
            {editorNavbarLeft}
            <div className="flex flex-1 min-w-0 overflow-x-auto items-stretch rounded-md bg-muted p-1 text-muted-foreground border border-border">
              {editorNavbarTabs}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editorNavbarActions}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap min-w-max pr-1">
            <Button
              asChild
              variant={location.pathname === "/" ? "default" : "ghost"}
              className="flex items-center gap-2"
            >
              <Link to="/" className="text-white">
                <Map className="w-4 h-4" />
                <span>Level Editor</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={
                location.pathname === "/model-viewer" ? "default" : "ghost"
              }
              className="flex items-center gap-2"
            >
              <Link to="/model-viewer" className="text-white">
                <Box className="w-4 h-4" />
                <span>Model Viewer</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={
                location.pathname === "/sprite-viewer" ? "default" : "ghost"
              }
              className="flex items-center gap-2"
            >
              <Link to="/sprite-viewer" className="text-white">
                <Image className="w-4 h-4" />
                <span>Sprite Editor</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={
                location.pathname === "/download-levels" ? "default" : "ghost"
              }
              className="flex items-center gap-2"
            >
              <Link to="/download-levels" className="text-white">
                <Download className="w-4 h-4" />
                <span>Custom Levels</span>
              </Link>
            </Button>
            {showExperimentalLinks && (
              <>
                <Button
                  asChild
                  variant={
                    location.pathname === "/item-models" ? "default" : "ghost"
                  }
                  className="flex items-center gap-2"
                >
                  <Link to="/item-models" className="text-white">
                    <Boxes className="w-4 h-4" />
                    <span>Item Models</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={
                    location.pathname === "/test-models" ? "default" : "ghost"
                  }
                  className="flex items-center gap-2"
                >
                  <Link to="/test-models" className="text-white">
                    <FlaskConical className="w-4 h-4" />
                    <span>Test Models</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={
                    location.pathname === "/item-audit" ? "default" : "ghost"
                  }
                  className="flex items-center gap-2"
                >
                  <Link to="/item-audit" className="text-white">
                    <ClipboardList className="w-4 h-4" />
                    <span>Item Audit</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
