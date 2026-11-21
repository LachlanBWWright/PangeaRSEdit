import { useId, useState, type PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MenuSectionProps = PropsWithChildren<{
  fullHeight?: boolean;
}>;

export function MenuSection({
  fullHeight = false,
  children,
}: MenuSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();

  if (fullHeight) return <div className="h-full min-h-0 overflow-y-auto">{children}</div>;

  return (
    <div className="shrink-0">
      <Button
        variant="outline"
        size="sm"
        aria-controls={panelId}
        aria-expanded={expanded}
        className="mb-2 ml-2 md:hidden"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide inspector" : "Show inspector"}
      </Button>
      <div id={panelId} className={cn("h-[min(38dvh,320px)] overflow-y-auto md:block md:h-[320px]", !expanded && "hidden")}>
        {children}
      </div>
    </div>
  );
}
