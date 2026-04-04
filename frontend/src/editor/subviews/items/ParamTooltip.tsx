import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { getGitHubPermalink } from "@/validation/gameRepositories";
import type { Citation, CodeSample } from "@/data/items/itemParams";

export function ParamTooltip({
  label,
  tooltip,
  defaultCitation,
  additionalCitations,
  codeSample,
  citationGame,
}: {
  label: ReactNode;
  tooltip: string;
  defaultCitation?: Citation;
  additionalCitations?: Citation[];
  codeSample?: CodeSample;
  citationGame?: string;
}) {
  if (!tooltip || tooltip.trim() === "") return <>{label}</>;
  const resolvedDefaultCitation =
    defaultCitation ??
    (codeSample && citationGame
      ? {
          label: "Legacy citation",
          url: getGitHubPermalink(citationGame, codeSample.fileName, codeSample.lineNumber) ?? "",
          fileName: codeSample.fileName,
          lineNumber: codeSample.lineNumber,
          endLineNumber: codeSample.endLineNumber,
          code: codeSample.code,
        }
      : undefined);

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
          {resolvedDefaultCitation?.url && (
            <a
              href={resolvedDefaultCitation.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-300 underline"
            >
              View source on GitHub
            </a>
          )}
          {(additionalCitations?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1">
              {additionalCitations?.map((citation, index) => (
                <a
                  key={`${citation.url}-${index}`}
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-300 underline"
                >
                  Additional citation {index + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
