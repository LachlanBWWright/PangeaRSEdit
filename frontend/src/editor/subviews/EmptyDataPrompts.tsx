/**
 * Prompt components shown when optional level data is null
 * Allows users to initialize empty data structures for fences, water, and splines
 */

import { MenuEmptyState } from "./MenuEmptyState";

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
  return (
    <MenuEmptyState
      title={title}
      description={description}
      actionLabel={buttonText}
      onAction={onInitialize}
      fillHeight={fillHeight}
    />
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

export function EmptyItemPrompt({ onInitialize }: { onInitialize: () => void }) {
  return (
    <EmptyDataPrompt
      title="No Items"
      description="This level doesn't have any item data yet. Add the item list to get started."
      buttonText="Add Item List"
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
