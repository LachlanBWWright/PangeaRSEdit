import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Popover = Dialog;
const PopoverTrigger = DialogTrigger;
const PopoverAnchor = React.Fragment;

function PopoverContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "max-w-sm rounded-md border border-gray-700 bg-gray-900 p-4 text-white shadow-lg sm:rounded-md",
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
