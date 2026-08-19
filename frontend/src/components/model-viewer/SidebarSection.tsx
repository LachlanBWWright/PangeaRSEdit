import type { ReactNode } from "react";

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({
  title,
  children,
  className = "",
}: SidebarSectionProps) {
  return (
    <section className={`border-b border-gray-700/80 pb-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
