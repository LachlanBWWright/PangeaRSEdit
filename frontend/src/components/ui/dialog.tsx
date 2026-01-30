<<<<<<< HEAD
import React, { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Root as DialogRoot, Trigger as DialogTriggerPrimitive, Portal as DialogPortalPrimitive, Close as DialogClosePrimitive, Overlay as DialogOverlayPrimitive, Content as DialogContentPrimitive, Title as DialogTitlePrimitive, Description as DialogDescriptionPrimitive } from "@radix-ui/react-dialog";
import { X } from "lucide-react";
=======
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
>>>>>>> origin/main

import { cn } from "@/lib/utils"

<<<<<<< HEAD
const Dialog = DialogRoot;

const DialogTrigger = DialogTriggerPrimitive;

const DialogPortal = DialogPortalPrimitive;

const DialogClose = DialogClosePrimitive;
=======
const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close
>>>>>>> origin/main

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogOverlayPrimitive>,
  ComponentPropsWithoutRef<typeof DialogOverlayPrimitive>
>(({ className, ...props }, ref) => (
  <DialogOverlayPrimitive
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
<<<<<<< HEAD
));
DialogOverlay.displayName = DialogOverlayPrimitive.displayName;
=======
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName
>>>>>>> origin/main

const DialogContent = forwardRef<
  ElementRef<typeof DialogContentPrimitive>,
  ComponentPropsWithoutRef<typeof DialogContentPrimitive>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogContentPrimitive
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogClosePrimitive className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClosePrimitive>
    </DialogContentPrimitive>
  </DialogPortal>
<<<<<<< HEAD
));
DialogContent.displayName = DialogContentPrimitive.displayName;
=======
))
DialogContent.displayName = DialogPrimitive.Content.displayName
>>>>>>> origin/main

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = forwardRef<
  ElementRef<typeof DialogTitlePrimitive>,
  ComponentPropsWithoutRef<typeof DialogTitlePrimitive>
>(({ className, ...props }, ref) => (
  <DialogTitlePrimitive
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
<<<<<<< HEAD
));
DialogTitle.displayName = DialogTitlePrimitive.displayName;
=======
))
DialogTitle.displayName = DialogPrimitive.Title.displayName
>>>>>>> origin/main

const DialogDescription = forwardRef<
  ElementRef<typeof DialogDescriptionPrimitive>,
  ComponentPropsWithoutRef<typeof DialogDescriptionPrimitive>
>(({ className, ...props }, ref) => (
  <DialogDescriptionPrimitive
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
<<<<<<< HEAD
));
DialogDescription.displayName = DialogDescriptionPrimitive.displayName;
=======
))
DialogDescription.displayName = DialogPrimitive.Description.displayName
>>>>>>> origin/main

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}