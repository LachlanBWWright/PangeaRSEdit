import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { getGitHubPermalink } from "@/validation/gameRepositories";
import type { CodeSample } from "@/validation/citationExtractor";

export function ParamTooltip({
  label,
  tooltip,
  codeSample,
  citationGame,
}: {
  label: ReactNode;
  tooltip: string;
  codeSample?: CodeSample;
  citationGame?: string;
}) {
  if (!tooltip || tooltip.trim() === "") return <>{label}</>;
  const permalink =
    codeSample && citationGame
      ? getGitHubPermalink(
          citationGame,
          codeSample.fileName,
          codeSample.lineNumber,
        )
      : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help underline underline-dotted">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-2">
          <pre className="whitespace-pre-wrap max-w-xs text-sm">{tooltip}</pre>
          {permalink && (
            <a
              href={permalink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-300 underline"
            >
              View source on GitHub
            </a>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
