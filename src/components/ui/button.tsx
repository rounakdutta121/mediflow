import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-navy)] !text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-navy-hover)] hover:!text-white dark:bg-[var(--brand)] dark:!text-[#041016] dark:hover:bg-[var(--brand-hover)]",
        secondary:
          "bg-[var(--accent)] !text-white shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] hover:!text-white",
        outline:
          "border border-[var(--border)] bg-[var(--surface)] !text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        ghost:
          "bg-transparent !text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        danger:
          "bg-[var(--danger)] !text-white hover:brightness-110 hover:!text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
