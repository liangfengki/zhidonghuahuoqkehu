import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] backdrop-blur-sm px-4 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted-fg)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:border-[var(--color-accent)]/40 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
