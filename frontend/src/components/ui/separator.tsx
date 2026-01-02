import React, { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { Root as SeparatorRoot } from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = forwardRef<
  ElementRef<typeof SeparatorRoot>,
  ComponentPropsWithoutRef<typeof SeparatorRoot>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorRoot
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorRoot.displayName

export { Separator }
