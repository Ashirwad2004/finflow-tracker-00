import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-[0_0_25px_rgba(59,130,246,0.6)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-105 active:scale-95 shadow-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] focus:shadow-[0_0_30px_rgba(59,130,246,0.7)] hover:button-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] focus:shadow-[0_0_30px_rgba(239,68,68,0.7)] hover:button-glow-destructive",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:shadow-accent/30 hover:shadow-[0_0_15px_rgba(156,163,175,0.3)] focus:shadow-[0_0_25px_rgba(156,163,175,0.5)] hover:button-glow-outline",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg hover:shadow-secondary/40 hover:shadow-[0_0_15px_rgba(107,114,128,0.4)] focus:shadow-[0_0_25px_rgba(107,114,128,0.6)] hover:button-glow-outline",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:shadow-accent/30 hover:shadow-[0_0_15px_rgba(156,163,175,0.3)] focus:shadow-[0_0_25px_rgba(156,163,175,0.5)] hover:button-glow-outline",
        link: "text-primary underline-offset-4 hover:underline hover:shadow-lg hover:shadow-primary/30 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)] focus:shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:button-glow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
