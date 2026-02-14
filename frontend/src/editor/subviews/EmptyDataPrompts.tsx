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
}

function EmptyDataPrompt({ title, description, buttonText, onInitialize }: EmptyDataPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-800 rounded-lg border border-gray-600">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300">{description}</p>
      </div>
      <Button onClick={onInitialize} className="w-auto px-6">
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
    />
  );
}
