import React from "react";

interface Props {
  title: string;
  children?: React.ReactNode;
}

export default function LevelGrid({ title, children }: Props) {
  return (
    <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
      <p>{title}</p>
      {children}
    </div>
  );
}
