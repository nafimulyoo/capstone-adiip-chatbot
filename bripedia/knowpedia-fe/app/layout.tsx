"use client";

import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { NavigationProvider } from "@/contexts/navigation-context";
import { AuthProvider } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutGrid } from "lucide-react";
import { useNavigation } from "@/contexts/navigation-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { LoginModal } from "@/components/login-modal";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

// Note: Metadata can only be exported from Server Components
// So we'll export it but the component itself is now a Client Component
// This may require restructuring if you need metadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Regulation Repository</title>
        <meta
          name="description"
          content="AI-powered knowledge base and search"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              <NavigationProvider>
                <NavigationWrapper>{children}</NavigationWrapper>
              </NavigationProvider>
            </LanguageProvider>
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

// Client component to handle navigation layout
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const { navMode, isCollapsed, toggleNavMode } = useNavigation();
  const { t } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  // Update login modal when authentication status changes
  React.useEffect(() => {
    if (!isAuthenticated && !showLoginModal) {
      // Only show modal when user logs out, not on initial page load
      // since we already show it based on initial state
    }
  }, [isAuthenticated, showLoginModal]);

  const collapsedWidth = 64;
  const fixedWidth = 256;
  const currentWidth = isCollapsed ? collapsedWidth : fixedWidth;

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  return (
    <>
      <LoginModal isOpen={showLoginModal} onOpenChange={setShowLoginModal} />
      <div
        className={cn(
          "flex min-h-screen",
          navMode === "topnav" ? "flex-col" : ""
        )}
      >
        {!isLoginPage && <AppSidebar onLoginClick={handleLoginClick} />}
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            navMode === "topnav" && !isLoginPage ? "pt-16" : ""
          )}
          style={
            navMode === "sidebar" && !isLoginPage
              ? { paddingLeft: `${currentWidth}px` }
              : undefined
          }
        >
          {navMode === "sidebar" && !isLoginPage && (
            <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
              <LanguageToggle />
              <ThemeToggle />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 border border-primary/30"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleNavMode();
                      }}
                    >
                      <LayoutGrid className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("nav.switchToTopnav")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <UserProfileDropdown onLoginClick={handleLoginClick} />
            </header>
          )}
          {children}
        </main>
      </div>
    </>
  );
}

// fix
