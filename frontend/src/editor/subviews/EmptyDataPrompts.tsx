/**
 * Prompt components shown when optional level data is null
 * Allows users to initialize empty data structures for fences, water, and splines
 */

import { Button } from "@/components/ui/button";

interface EmptyDataPromptProps {
  title: string;
  description: string;
  buttonText: string;
  onInitialize: () => void;
  fillHeight?: boolean;
}

export function EmptyDataPrompt({
  title,
  description,
  buttonText,
  onInitialize,
  fillHeight = false,
}: EmptyDataPromptProps) {
  const containerClassName = fillHeight
    ? "flex h-full min-h-full w-full flex-col gap-4 p-8"
    : "flex w-full flex-col gap-4 p-8";

  return (
    <div className={containerClassName}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300">{description}</p>
      </div>
      <Button onClick={onInitialize} className="w-auto px-6 self-center">
        {buttonText}
      </Button>
    </div>
  );
}

export function EmptyFencePrompt({ onInitialize }: { onInitialize: () => void }) {
  return (
    <EmptyDataPrompt
      title="No Fences"
      description="This level doesn't have any fences yet. Add your first fence to get started."
      buttonText="Add First Fence"
      onInitialize={onInitialize}
      fillHeight
    />
  );
}

export function EmptyWaterPrompt({ onInitialize }: { onInitialize: () => void }) {
  return (
    <EmptyDataPrompt
      title="No Water Bodies"
      description="This level doesn't have any water bodies yet. Add your first water body to get started."
      buttonText="Add First Water Body"
      onInitialize={onInitialize}
      fillHeight
    />
  );
}

export function EmptySplinePrompt({ onInitialize }: { onInitialize: () => void }) {
  return (
    <EmptyDataPrompt
      title="No Splines"
      description="This level doesn't have any splines yet. Add your first spline to get started."
      buttonText="Add First Spline"
      onInitialize={onInitialize}
      fillHeight
    />
  );
}
