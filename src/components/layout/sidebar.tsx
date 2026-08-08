"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LayoutDashboard, Users, FileText, TrendingUp, Settings, Menu, X, LogOut, User, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/candidates", label: "候选人", icon: Users },
  { href: "/reports", label: "每日总结", icon: FileText },
  { href: "/trends", label: "趋势分析", icon: TrendingUp },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sidebar = (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <Link href="/" className="font-bold text-lg tracking-tight">
            <span className="text-primary">HR</span> Recruit
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-accent transition-colors hidden lg:block">
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        {mounted && (
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn("flex items-center gap-2 w-full rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors",
              collapsed ? "justify-center p-2" : "px-3 py-2")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && (theme === "dark" ? "浅色模式" : "深色模式")}
          </button>
        )}
        {session?.user && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{session.user.email}</span>
          </div>
        )}
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn("flex items-center gap-2 w-full rounded-md text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors",
            collapsed ? "justify-center p-2" : "px-3 py-2")}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "退出"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-sm">
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - desktop always visible, mobile slide-in */}
      <aside className={cn(
        "flex flex-col border-r bg-card transition-all duration-200 z-40",
        "fixed lg:relative inset-y-0 left-0",
        "lg:flex", // always flex on desktop
        mobileOpen ? "flex w-64" : "hidden lg:flex", // show on mobile only when open
        collapsed ? "lg:w-16" : "lg:w-64"
      )}>
        {sidebar}
      </aside>
    </>
  );
}
