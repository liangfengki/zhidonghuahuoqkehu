"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Sun,
  Moon,
  Monitor,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";

const navItems = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/leads", label: "线索库", icon: Users },
  { href: "/inbox", label: "收件箱", icon: Inbox },
  { href: "/settings", label: "设置", icon: Settings },
];

const themeCycle: Array<{ next: "system" | "light" | "dark"; icon: typeof Sun; label: string }> = [
  { next: "dark", icon: Monitor, label: "跟随系统" },
  { next: "system", icon: Sun, label: "浅色模式" },
  { next: "light", icon: Moon, label: "深色模式" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { auth } = useAuth();
  const { theme, setTheme } = useTheme();

  const themeIdx = theme === "system" ? 0 : theme === "light" ? 1 : 2;
  const currentThemeCfg = themeCycle[themeIdx];

  return (
    <aside
      className={cn(
        "flex flex-col glass-heavy transition-all duration-300 border-r-0 z-20",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo / header */}
      <div className="flex items-center justify-between h-14 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/30">
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm">获客平台</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-fg)] transition-colors",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25"
                  : "text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-fg)]",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: theme toggle + user */}
      <div className="p-2 border-t border-[var(--color-glass-border)]">
        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "px-2")}>
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(currentThemeCfg.next)}
            className="p-2 rounded-lg text-[var(--color-muted-fg)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-fg)] transition-colors"
            title={currentThemeCfg.label}
          >
            <currentThemeCfg.icon size={17} />
          </button>

          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
                <User size={13} className="text-[var(--color-accent)]" />
              </div>
              <span className="text-xs text-[var(--color-muted-fg)] truncate">
                {auth.user?.email?.split("@")[0] || "用户"}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
