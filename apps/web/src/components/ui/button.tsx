import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]";
    const variants: Record<string, string> = {
      default:
        "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] shadow-lg shadow-[var(--color-accent)]/20",
      destructive:
        "bg-[var(--color-danger)] text-white hover:opacity-90 shadow-lg shadow-red-500/20",
      outline:
        "border border-[var(--color-glass-border)] bg-[var(--color-subtle)] hover:bg-[var(--color-surface-hover)] text-[var(--color-fg)]",
      secondary:
        "bg-[var(--color-subtle)] text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)]",
      ghost:
        "text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-fg)]",
      link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
    };
    const sizes: Record<string, string> = {
      default: "h-10 px-5 py-2.5",
      sm: "h-9 rounded-lg px-3.5 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10",
    };
    return (
      <button className={cn(baseStyles, variants[variant], sizes[size], className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button };
