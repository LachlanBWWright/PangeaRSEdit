import { PropsWithChildren } from "react";

type MenuSectionProps = PropsWithChildren<{
  className?: string;
}>;

export function MenuSection({ className, children }: MenuSectionProps) {
  return (
    <div className={`h-[300px] overflow-y-auto ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
