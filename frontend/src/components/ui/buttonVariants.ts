import { cva } from "class-variance-authority";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANT_CLASSES = {
  default: "bg-blue-600 text-white shadow hover:bg-blue-700",
  destructive: "bg-red-600 text-white shadow hover:bg-red-700",
  zoom: "bg-green-600 text-white shadow hover:bg-green-700",
  outline:
    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const SIZE_CLASSES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
} as const;

const DEFAULT_VARIANTS = {
  variant: "default" as const,
  size: "default" as const,
};

export const buttonVariants = cva(BASE_CLASSES, {
  variants: { variant: VARIANT_CLASSES, size: SIZE_CLASSES },
  defaultVariants: DEFAULT_VARIANTS,
});

export default buttonVariants;
