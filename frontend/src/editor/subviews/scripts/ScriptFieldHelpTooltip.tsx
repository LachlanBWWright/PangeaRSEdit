import type React from "react";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        <button
          type="button"
          aria-label={label}
          className="inline-flex text-slate-500 transition-colors hover:text-slate-300"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-left">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
