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
    <section ref={containerRef} className="border-t border-gray-700/70 pt-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h3>
      {children}
    </section>
  );
}
