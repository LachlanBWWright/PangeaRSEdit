import { PropsWithChildren } from "react";

type MenuSectionProps = PropsWithChildren<{
  className?: string;
  scrollable?: boolean;
}>;

export function MenuSection({
  className,
  children,
  scrollable = true,
}: MenuSectionProps) {
  return (
    <div
      className={`h-[300px] ${scrollable ? "overflow-y-auto" : "overflow-hidden"} ${className ?? ""}`.trim()}
    >
      {children}
    </div>
  );
}
