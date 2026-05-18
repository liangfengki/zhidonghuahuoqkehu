import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const variants: Record<string, string> = {
  default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)]",
  outline: "border border-[var(--border)]",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}
      {...props}
    />
  );
}

export { Badge };
