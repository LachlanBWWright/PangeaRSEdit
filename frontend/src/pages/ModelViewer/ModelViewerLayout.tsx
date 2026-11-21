import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useWorkspaceOrientation } from "@/components/editor/useWorkspaceOrientation";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface ModelViewerLayoutProps {
  readonly modelSessionId: number | null;
  readonly sidebar: ReactNode;
  readonly viewport: ReactNode;
}

export function ModelViewerLayout({ modelSessionId, sidebar, viewport }: ModelViewerLayoutProps) {
  const orientation = useWorkspaceOrientation();
  const [openToolsSession, setOpenToolsSession] = useState<number | null>(null);
  const toolsId = useId();
  const toolsButton = useRef<HTMLButtonElement>(null);
  const hasModel = modelSessionId !== null;
  const toolsOpen = hasModel && openToolsSession === modelSessionId;

  useEffect(() => {
    if (hasModel && orientation === "vertical" && document.activeElement === document.body) {
      toolsButton.current?.focus({ preventScroll: true });
    }
  }, [hasModel, orientation]);

  if (orientation === "horizontal") {
    return (
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={30} minSize={20} className="min-h-0 min-w-0 pr-2">
          {sidebar}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} minSize={35} className="min-h-0 pl-2">
          {viewport}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {hasModel && (
        <>
          <Button
            ref={toolsButton}
            type="button"
            variant="outline"
            aria-expanded={toolsOpen}
            aria-controls={toolsId}
            onClick={() => setOpenToolsSession(toolsOpen ? null : modelSessionId)}
            className="h-11 shrink-0 justify-between px-3"
          >
            Model tools
            <ChevronDown aria-hidden="true" className={toolsOpen ? "rotate-180" : undefined} />
          </Button>
          <section aria-label="Model viewport" className="min-h-0 flex-1">
            {viewport}
          </section>
        </>
      )}
      <div
        id={toolsId}
        hidden={hasModel && !toolsOpen}
        className={hasModel ? "h-[min(20rem,42dvh)] shrink-0 overflow-hidden rounded-md border border-gray-700" : "min-h-0 flex-1"}
      >
        {sidebar}
      </div>
    </div>
  );
}
