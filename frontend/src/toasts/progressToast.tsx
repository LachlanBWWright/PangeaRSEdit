import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const DEFAULT_PROGRESS_TOAST_TIMEOUT_MS = 30_000;

type ProgressToastStatus = "loading" | "success" | "error";

type ProgressToastId = string;

interface ProgressToastUpdate {
  id: ProgressToastId;
  title: string;
  description?: string;
  current: number;
  completed: number;
  timeoutMs?: number;
}

interface ProgressToastCompletion {
  id: ProgressToastId;
  title: string;
  description?: string;
}

interface ProgressToastEntry {
  timeoutId: number;
}

const progressToasts = new Map<ProgressToastId, ProgressToastEntry>();

function getProgressPercentage(current: number, completed: number): number {
  if (completed <= 0) {
    return 0;
  }

  const percentage = Math.floor((current / completed) * 100);
  return Math.min(Math.max(percentage, 0), 100);
}

function clearProgressToastTimeout(id: ProgressToastId): void {
  const entry = progressToasts.get(id);
  if (!entry) {
    return;
  }

  clearTimeout(entry.timeoutId);
  progressToasts.delete(id);
}

function scheduleProgressToastTimeout({
  id,
  title,
  timeoutMs,
}: {
  id: ProgressToastId;
  title: string;
  timeoutMs?: number;
}): void {
  clearProgressToastTimeout(id);

  const timeoutId = window.setTimeout(() => {
    progressToasts.delete(id);
    toast.error(`${title} timed out`, {
      id,
      description: "The operation took longer than expected.",
    });
  }, timeoutMs ?? DEFAULT_PROGRESS_TOAST_TIMEOUT_MS);

  progressToasts.set(id, { timeoutId });
}

function ProgressToastContent({
  description,
  current,
  completed,
  status,
}: {
  description?: string;
  current: number;
  completed: number;
  status: ProgressToastStatus;
}) {
  const percentage = getProgressPercentage(current, completed);
  const indicator =
    status === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
    ) : status === "error" ? (
      <XCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-blue-300" aria-hidden="true" />
    );

  return (
    <div className="mt-2 space-y-2">
      {description ? <p className="text-sm text-gray-300">{description}</p> : null}
      <div className="flex items-center gap-2 text-xs text-gray-300">
        {indicator}
        <span>
          {current}/{completed}
        </span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-1.5 bg-gray-700" />
    </div>
  );
}

function showLoadingProgressToast(update: ProgressToastUpdate): void {
  scheduleProgressToastTimeout(update);
  toast.loading(update.title, {
    id: update.id,
    description: (
      <ProgressToastContent
        description={update.description}
        current={update.current}
        completed={update.completed}
        status="loading"
      />
    ),
    duration: update.timeoutMs ?? DEFAULT_PROGRESS_TOAST_TIMEOUT_MS,
  });
}

function completeProgressToast(completion: ProgressToastCompletion): void {
  clearProgressToastTimeout(completion.id);
  toast.success(completion.title, {
    id: completion.id,
    description: completion.description,
  });
}

function failProgressToast(completion: ProgressToastCompletion): void {
  clearProgressToastTimeout(completion.id);
  toast.error(completion.title, {
    id: completion.id,
    description: completion.description,
  });
}

function dismissProgressToast(id: ProgressToastId): void {
  clearProgressToastTimeout(id);
  toast.dismiss(id);
}

export const progressToast = {
  start: showLoadingProgressToast,
  update: showLoadingProgressToast,
  complete: completeProgressToast,
  fail: failProgressToast,
  dismiss: dismissProgressToast,
};
