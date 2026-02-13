import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ResizablePrimitive.Group;
const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Separator> & {
    withHandle?: boolean;
  }
>(({ className, withHandle, ...props }, ref) => (
  <ResizablePrimitive.Separator
    elementRef={ref}
    className={cn(
      "relative flex w-2 items-center justify-center bg-gray-800",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:bg-gray-700",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
      className,
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-8 w-4 items-center justify-center rounded-sm border border-gray-700 bg-gray-900">
        <GripVertical className="h-3.5 w-3.5 text-gray-300" />
      </div>
    ) : null}
  </ResizablePrimitive.Separator>
));
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
