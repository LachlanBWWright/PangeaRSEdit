import type React from "react";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface ScriptFieldHelpTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function ScriptFieldHelpTooltip({
  label,
  children,
}: ScriptFieldHelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="icon"
          size="icon"
          aria-label={label}
          className="h-5 w-5"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-left">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
