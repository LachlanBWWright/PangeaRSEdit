import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import buttonVariants from "./buttonVariants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  selected?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, selected = false, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    // Selected styling by variant
    let selectedClass = "";
    if (selected) {
      if (variant === "destructive") {
        selectedClass = "bg-red-700 text-white";
      } else if (variant === "zoom") {
        selectedClass = "bg-green-700 text-white";
      } else {
        selectedClass = "bg-blue-700 text-white";
      }
    }
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          selectedClass,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
