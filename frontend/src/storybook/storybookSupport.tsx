import type { ReactNode } from "react";

export const storybookViewportMatrix = [
  { name: "narrow-phone", width: 320, height: 568 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

export function StorySurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "min-h-[18rem] rounded-lg border border-slate-700 bg-slate-950 p-6 text-slate-100",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function StorySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
