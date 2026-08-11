import { Button } from "@/components/ui/button";

interface MenuEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  fillHeight?: boolean;
  compact?: boolean;
}

export function MenuEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  fillHeight = false,
  compact = false,
}: MenuEmptyStateProps) {
  const spacingClassName = compact ? "gap-3 p-4" : "gap-4 p-8";
  const heightClassName = fillHeight ? "h-full min-h-full" : "";
  const hasAction = actionLabel !== undefined && onAction !== undefined;

  return (
    <div
      className={`flex w-full flex-col ${spacingClassName} ${heightClassName}`}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h3
          className={`${compact ? "text-base" : "text-xl"} mb-2 font-semibold text-white`}
        >
          {title}
        </h3>
        <p className={compact ? "text-sm text-gray-300" : "text-gray-300"}>
          {description}
        </p>
      </div>
      {hasAction && (
        <Button onClick={onAction} className="w-auto self-center px-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
