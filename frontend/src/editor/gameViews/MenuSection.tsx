import { PropsWithChildren } from "react";

type MenuSectionProps = PropsWithChildren<{
  className?: string;
}>;

export function MenuSection({
  className,
  children,
}: MenuSectionProps) {
  return (
    <div
      className={`h-[320px] min-h-0 shrink-0 overflow-y-auto ${className ?? ""}`.trim()}
    >
      {children}
    </div>
  );
}
