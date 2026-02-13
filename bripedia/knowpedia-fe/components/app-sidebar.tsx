"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  MessageSquare,
  FolderOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutGrid,
  Sidebar as SidebarIcon,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useNavigation } from "@/contexts/navigation-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

interface AppSidebarProps {
  onLoginClick?: () => void;
}

export function AppSidebar({ onLoginClick }: AppSidebarProps = {}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { navMode, isCollapsed, toggleNavMode, toggleCollapse } =
    useNavigation();
  const { user } = useAuth();

  const baseNavItems = [
    {
      title: t("search.title"),
      href: "/search",
      icon: Search,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: MessageSquare,
    },
    {
      title: "Compare",
      href: "/compare",
      icon: Scale,
    },
  ];

  // Only add Files menu for admin users
  const navItems =
    user?.groups.includes("admin")
      ? [
        ...baseNavItems,
        {
          title: t("files.title"),
          href: "/files",
          icon: FolderOpen,
        },
      ]
      : baseNavItems;

  // Top Navigation Bar
  if (navMode === "topnav") {
    return (
      <TooltipProvider>
        <div className="fixed top-0 left-0 right-0 z-40 h-16 border-b bg-background">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <Link
                href="/search"
                className="flex items-center gap-2 font-semibold"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-lg blur-sm opacity-60" />
                  <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight">
                  Know<span className="text-primary">Pedia</span>
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border border-transparent",
                        isActive
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 border-0"
                          : "text-muted-foreground hover:text-foreground hover:border-primary/40"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <LanguageToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t("nav.changeLanguage")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t("nav.toggleTheme")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleNavMode}
                    className="h-10 w-10 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 border border-primary/30"
                  >
                    <SidebarIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nav.switchToSidebar")}</TooltipContent>
              </Tooltip>
              <UserProfileDropdown onLoginClick={onLoginClick} />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Sidebar Navigation
  const collapsedWidth = 64;
  const fixedWidth = 256;
  const currentWidth = isCollapsed ? collapsedWidth : fixedWidth;

  return (
    <TooltipProvider>
      <aside
        style={{ width: `${currentWidth}px` }}
        className="fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300"
      >
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px]">
            {!isCollapsed && (
              <Link
                href="/search"
                className="flex items-center gap-2 font-semibold"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-lg blur-sm opacity-60" />
                  <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight whitespace-nowrap">
                  Know<span className="text-primary">Pedia</span>
                </span>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/search" className="mx-auto">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-lg blur-sm opacity-60" />
                  <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </Link>
            )}
          </div>
          <nav className="flex-1 space-y-1 px-3 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all border border-transparent",
                        isActive
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 border-0"
                          : "text-muted-foreground hover:text-foreground hover:border-primary/40",
                        isCollapsed && "justify-center"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
          <div className="border-t p-2 space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="w-full justify-center cursor-pointer bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md "
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t("nav.collapse")}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed
                  ? t("nav.expandSidebar")
                  : t("nav.collapseSidebar")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
