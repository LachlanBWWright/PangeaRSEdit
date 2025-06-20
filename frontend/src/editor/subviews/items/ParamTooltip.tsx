import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";

export function ParamTooltip({
  label,
  tooltip,
}: {
  label: ReactNode;
  tooltip: string;
}) {
  if (!tooltip || tooltip.trim() === "") return <>{label}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help underline underline-dotted">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <pre className="whitespace-pre-wrap max-w-xs text-sm">{tooltip}</pre>
      </TooltipContent>
    </Tooltip>
  );
}
