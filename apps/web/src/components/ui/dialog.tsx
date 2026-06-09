"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4 glass-heavy rounded-2xl shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight text-[var(--color-fg)]", className)}
      {...props}
    />
  );
}

function DialogClose({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-fg)] transition-colors"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose };
