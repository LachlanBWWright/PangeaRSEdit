import React, { type ComponentPropsWithoutRef, type ElementRef } from "react";
import {
  Root as DropdownMenuRoot,
  Trigger as DropdownMenuTriggerRoot,
  Portal as DropdownMenuPortal,
  Content as DropdownMenuContentRoot,
  CheckboxItem as DropdownMenuCheckboxItemRoot,
  ItemIndicator as DropdownMenuItemIndicator,
  Label as DropdownMenuLabelRoot,
  Separator as DropdownMenuSeparatorRoot,
} from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuRoot;
const DropdownMenuTrigger = DropdownMenuTriggerRoot;

const DropdownMenuContent = React.forwardRef<
  ElementRef<typeof DropdownMenuContentRoot>,
  ComponentPropsWithoutRef<typeof DropdownMenuContentRoot>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPortal>
    <DropdownMenuContentRoot
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </DropdownMenuPortal>
));
DropdownMenuContent.displayName = DropdownMenuContentRoot.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  ElementRef<typeof DropdownMenuCheckboxItemRoot>,
  ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItemRoot>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuCheckboxItemRoot
    ref={ref}
    checked={checked}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuItemIndicator>
    </span>
    {children}
  </DropdownMenuCheckboxItemRoot>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuCheckboxItemRoot.displayName;

const DropdownMenuLabel = React.forwardRef<
  ElementRef<typeof DropdownMenuLabelRoot>,
  ComponentPropsWithoutRef<typeof DropdownMenuLabelRoot>
>(({ className, ...props }, ref) => (
  <DropdownMenuLabelRoot
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuLabelRoot.displayName;

const DropdownMenuSeparator = React.forwardRef<
  ElementRef<typeof DropdownMenuSeparatorRoot>,
  ComponentPropsWithoutRef<typeof DropdownMenuSeparatorRoot>
>(({ className, ...props }, ref) => (
  <DropdownMenuSeparatorRoot
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuSeparatorRoot.displayName;

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
