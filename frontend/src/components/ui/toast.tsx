import React, {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import {
  Provider as ToastProviderPrimitive,
  Viewport as ToastViewportPrimitive,
  Root as ToastRoot,
  Action as ToastActionPrimitive,
  Close as ToastClosePrimitive,
  Title as ToastTitlePrimitive,
  Description as ToastDescriptionPrimitive,
} from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastProviderPrimitive;

const ToastViewport = forwardRef<
  ElementRef<typeof ToastViewportPrimitive>,
  ComponentPropsWithoutRef<typeof ToastViewportPrimitive>
>(({ className, ...props }, ref) => (
  <ToastViewportPrimitive
    ref={ref}
    className={cn(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-105",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastViewportPrimitive.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-black text-white",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = forwardRef<
  ElementRef<typeof ToastRoot>,
  ComponentPropsWithoutRef<typeof ToastRoot> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastRoot
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastRoot.displayName;

const ToastAction = forwardRef<
  ElementRef<typeof ToastActionPrimitive>,
  ComponentPropsWithoutRef<typeof ToastActionPrimitive>
>(({ className, ...props }, ref) => (
  <ToastActionPrimitive
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastActionPrimitive.displayName;

const ToastClose = forwardRef<
  ElementRef<typeof ToastClosePrimitive>,
  ComponentPropsWithoutRef<typeof ToastClosePrimitive>
>(({ className, ...props }, ref) => (
  <ToastClosePrimitive
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastClosePrimitive>
));
ToastClose.displayName = ToastClosePrimitive.displayName;

const ToastTitle = forwardRef<
  ElementRef<typeof ToastTitlePrimitive>,
  ComponentPropsWithoutRef<typeof ToastTitlePrimitive>
>(({ className, ...props }, ref) => (
  <ToastTitlePrimitive
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastTitlePrimitive.displayName;

const ToastDescription = forwardRef<
  ElementRef<typeof ToastDescriptionPrimitive>,
  ComponentPropsWithoutRef<typeof ToastDescriptionPrimitive>
>(({ className, ...props }, ref) => (
  <ToastDescriptionPrimitive
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastDescriptionPrimitive.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
