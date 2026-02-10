import React from "react";

interface ChildProps {
  className?: string;
}

interface Props {
  title: string;
  children?: React.ReactNode;
}

export function LevelGrid({ title, children }: Props) {
  // Ensure children render as a vertical list of full-width items (Buttons)
  const childrenWithFullWidth = React.Children.map(children, (child) => {
    if (React.isValidElement<ChildProps>(child)) {
      const existingClassName = child.props.className;
      return React.cloneElement(child, {
        className: [existingClassName, "w-full"].filter(Boolean).join(" "),
      });
    }
    return child;
  });

  return (
    <div className="flex flex-col gap-1 text-2xl min-w-40">
      <p>{title}</p>
      <div>{childrenWithFullWidth}</div>
    </div>
  );
}
