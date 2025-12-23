import React from "react";

interface Props {
  title: string;
  children?: React.ReactNode;
}

export function LevelGrid({ title, children }: Props) {
  return (
    <div className="flex flex-col gap-1 text-2xl min-w-40">
      <p>{title}</p>
      {children}
    </div>
  );
}
