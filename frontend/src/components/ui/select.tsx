import React, { type ComponentPropsWithoutRef, type ElementRef } from "react";
import {
  Root as SelectRoot,
  Group as SelectGroupRoot,
  Value as SelectValueRoot,
  Trigger as SelectTriggerRoot,
  Icon as SelectIcon,
  ScrollUpButton as SelectScrollUpButtonRoot,
  ScrollDownButton as SelectScrollDownButtonRoot,
  Portal as SelectPortal,
  Content as SelectContentRoot,
  Viewport as SelectViewport,
  Label as SelectLabelRoot,
  Item as SelectItemRoot,
  ItemIndicator as SelectItemIndicatorRoot,
  ItemText as SelectItemTextRoot,
  Separator as SelectSeparatorRoot,
} from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectRoot;

const SelectGroup = SelectGroupRoot;

const SelectValue = SelectValueRoot;

const SelectTrigger = React.forwardRef<
  ElementRef<typeof SelectTriggerRoot>,
  ComponentPropsWithoutRef<typeof SelectTriggerRoot>
>(({ className, children, ...props }, ref) => (
  <SelectTriggerRoot
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectIcon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectIcon>
  </SelectTriggerRoot>
));
SelectTrigger.displayName = SelectTriggerRoot.displayName;

const SelectScrollUpButton = React.forwardRef<
  ElementRef<typeof SelectScrollUpButtonRoot>,
  ComponentPropsWithoutRef<typeof SelectScrollUpButtonRoot>
>(({ className, ...props }, ref) => (
  <SelectScrollUpButtonRoot
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectScrollUpButtonRoot>
));
SelectScrollUpButton.displayName = SelectScrollUpButtonRoot.displayName;

const SelectScrollDownButton = React.forwardRef<
  ElementRef<typeof SelectScrollDownButtonRoot>,
  ComponentPropsWithoutRef<typeof SelectScrollDownButtonRoot>
>(({ className, ...props }, ref) => (
  <SelectScrollDownButtonRoot
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectScrollDownButtonRoot>
));
SelectScrollDownButton.displayName = SelectScrollDownButtonRoot.displayName;

const SelectContent = React.forwardRef<
  ElementRef<typeof SelectContentRoot>,
  ComponentPropsWithoutRef<typeof SelectContentRoot>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPortal>
    <SelectContentRoot
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectViewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
        )}
      >
        {children}
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContentRoot>
  </SelectPortal>
));
SelectContent.displayName = SelectContentRoot.displayName;

const SelectLabel = React.forwardRef<
  ElementRef<typeof SelectLabelRoot>,
  ComponentPropsWithoutRef<typeof SelectLabelRoot>
>(({ className, ...props }, ref) => (
  <SelectLabelRoot
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectLabelRoot.displayName;

const SelectItem = React.forwardRef<
  ElementRef<typeof SelectItemRoot>,
  ComponentPropsWithoutRef<typeof SelectItemRoot>
>(({ className, children, ...props }, ref) => (
  <SelectItemRoot
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicatorRoot>
        <Check className="h-4 w-4" />
      </SelectItemIndicatorRoot>
    </span>
    <SelectItemTextRoot>{children}</SelectItemTextRoot>
  </SelectItemRoot>
));
SelectItem.displayName = SelectItemRoot.displayName;

const SelectSeparator = React.forwardRef<
  ElementRef<typeof SelectSeparatorRoot>,
  ComponentPropsWithoutRef<typeof SelectSeparatorRoot>
>(({ className, ...props }, ref) => (
  <SelectSeparatorRoot
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectSeparatorRoot.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
