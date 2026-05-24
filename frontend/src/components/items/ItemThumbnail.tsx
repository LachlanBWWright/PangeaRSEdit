import type { ReactNode } from "react";
import { Game } from "@/data/globals/globals";
import {
  findBestItemScreenshot,
  getItemScreenshotManifest,
  type ItemScreenshotKind,
} from "@/data/items/itemScreenshotManifest";

interface ItemThumbnailProps {
  readonly game: Game;
  readonly kind: ItemScreenshotKind;
  readonly itemType: number;
  readonly label: string;
  /** If set, overrides which text is used for the fallback badge (keeps `label` for display). */
  readonly badgeLabel?: string;
  readonly levelNum?: number;
  readonly className?: string;
  readonly params?: {
    readonly p0?: number;
    readonly p1?: number;
    readonly p2?: number;
    readonly p3?: number;
    readonly flags?: number;
  };
  readonly metadata?: ReactNode;
  readonly compact?: boolean;
}

function buildFallbackBadge(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return "?";
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function ItemThumbnail({
  game,
  kind,
  itemType,
  label,
  badgeLabel,
  levelNum,
  className,
  params,
  metadata,
  compact = false,
}: ItemThumbnailProps) {
  const manifestResult = getItemScreenshotManifest();
  const screenshot = manifestResult.isOk()
    ? findBestItemScreenshot(manifestResult.value, {
        game,
        kind,
        itemType,
        levelNum,
        params,
      })
    : null;

  const thumbnailSizeClass = compact ? "h-4 w-6" : "h-10 w-10";
  const fallbackTextClass = compact ? "text-[8px]" : "text-[10px]";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`.trim()}>
      {screenshot ? (
        <div
          className={`relative ${thumbnailSizeClass} shrink-0 overflow-hidden rounded border border-border/60 bg-muted`}
        >
          <img
            src={screenshot.imageUrl}
            alt={`${label} screenshot`}
            className="h-full w-full object-cover"
          />
          {screenshot.verificationStatus === "approximate" ? (
            <span className="absolute right-0 top-0 rounded-bl bg-amber-600 px-1 text-[9px] font-medium text-white">
              ~
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className={`flex ${thumbnailSizeClass} shrink-0 items-center justify-center rounded border border-dashed border-border/60 bg-muted font-semibold text-muted-foreground ${fallbackTextClass}`}
        >
          {buildFallbackBadge(badgeLabel ?? label)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate">{label}</div>
        {metadata ? (
          <div className="truncate text-xs text-muted-foreground">
            {metadata}
          </div>
        ) : screenshot || compact ? null : (
          <div className="truncate text-xs text-muted-foreground">
            no screenshot
          </div>
        )}
      </div>
    </div>
  );
}
