import React, { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { Root as SliderRoot, Track as SliderTrack, Range as SliderRange, Thumb as SliderThumb } from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = forwardRef<
  ElementRef<typeof SliderRoot>,
  ComponentPropsWithoutRef<typeof SliderRoot>
>(({ className, ...props }, ref) => (
  <SliderRoot
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderTrack className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderRange className="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderRoot>
))
Slider.displayName = SliderRoot.displayName

export { Slider }
