import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { Root as CheckboxRoot, Indicator as CheckboxIndicator } from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = forwardRef<
  ElementRef<typeof CheckboxRoot>,
  ComponentPropsWithoutRef<typeof CheckboxRoot>
>(({ className, ...props }, ref) => (
  <CheckboxRoot
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-400 bg-white",
      className
    )}
    {...props}
  >
    <CheckboxIndicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxIndicator>
  </CheckboxRoot>
))
Checkbox.displayName = CheckboxRoot.displayName

export { Checkbox }
