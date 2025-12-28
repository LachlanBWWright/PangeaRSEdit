import React from "react";

interface Props {
  title: string;
  children?: React.ReactNode;
}

export function LevelGrid({ title, children }: Props) {
  // Ensure children render as a vertical list of full-width items (Buttons)
  const childrenWithFullWidth = React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child as React.ReactElement<{ className?: string }>, {
          className: [
            (child as React.ReactElement<{ className?: string }>).props?.className,
            "w-full",
          ]
            .filter(Boolean)
            .join(" "),
        })
      : child,
  );

  return (
    <div className="flex flex-col gap-1 text-2xl min-w-40">
      <p>{title}</p>
      {childrenWithFullWidth}
    </div>
  );
}
