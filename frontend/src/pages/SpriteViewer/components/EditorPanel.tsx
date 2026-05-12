import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EditorPanelProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
}

export function EditorPanel({
  title,
  children,
  className,
  contentClassName,
}: EditorPanelProps) {
  return (
    <Card className={cn("border-gray-700 bg-gray-800", className)}>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm font-medium text-gray-100">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-3 px-3 pb-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

interface EditorFieldProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly hint?: string;
}

export function EditorField({ label, children, hint }: EditorFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface MetricGridProps {
  readonly items: readonly {
    readonly label: string;
    readonly value: string | number;
  }[];
}

export function MetricGrid({ items }: MetricGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {items.map((item) => (
        <div key={item.label} className="rounded bg-gray-900/70 p-2">
          <p className="text-gray-500">{item.label}</p>
          <p className="font-mono text-gray-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
