"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace("/auth/login");
    }
  }, [auth.loading, auth.user, router]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar — glass bar */}
        <header className="h-14 glass border-b border-[var(--color-glass-border)] flex items-center justify-between px-6 shrink-0 z-10">
          <div>
            <span className="text-sm text-[var(--color-muted-fg)]">
              {auth.user?.name || "企业获客平台"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-fg)]">
              <div className="w-7 h-7 rounded-full bg-[var(--color-subtle)] flex items-center justify-center border border-[var(--color-glass-border)]">
                <User size={14} />
              </div>
              <span className="text-xs">{auth.user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-danger)] transition-colors"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="animate-in fade-in duration-300">{children}</div>
        </main>
      </div>
    </div>
  );
}
