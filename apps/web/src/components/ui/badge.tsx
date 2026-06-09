import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const variants: Record<string, string> = {
  default:
    "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30",
  secondary: "bg-[var(--color-subtle)] text-[var(--color-muted-fg)] border border-[var(--color-glass-border)]",
  destructive:
    "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30",
  outline:
    "border border-[var(--color-glass-border)] text-[var(--color-fg)] bg-transparent",
  success:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  warning:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
