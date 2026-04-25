import type { ReactNode, RefObject } from "react";

interface ViewerSectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly containerRef?: RefObject<HTMLDivElement | null>;
}

export function ViewerSection({
  title,
  children,
  containerRef,
}: ViewerSectionProps) {
  return (
    <div ref={containerRef} className="space-y-3 border-t border-gray-700 pt-3">
      <div className="text-xs font-semibold text-gray-300">{title}</div>
      {children}
    </div>
  );
}
