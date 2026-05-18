"use client";

import { Sidebar } from "./sidebar";
import { Bell, User } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0">
          <div>
            <span className="text-sm text-[var(--muted-foreground)]">企业名称</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-1 rounded hover:bg-[var(--accent)] transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <button className="flex items-center gap-2 p-1 rounded hover:bg-[var(--accent)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                <User size={16} />
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
