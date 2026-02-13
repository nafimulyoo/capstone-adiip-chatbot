"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const getLevelInfo = (level: string, groups: string[] = []) => {
  if (groups.includes("admin")) {
    return {
      label: "Admin",
      level: level.charAt(0).toUpperCase() + level.slice(1),
      group: "All Groups",
      description: "Full system access",
      color: "bg-red-500/10 text-red-600 border-red-500/20",
    };
  }

  switch (level) {
    case "director":
      return {
        label: "Director",
        level: "Director",
        group: groups[0] || "Management",
        description: "High-level access",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      };
    case "manager":
      return {
        label: "Manager",
        level: "Manager",
        group: groups[0] || "Operations",
        description: "Standard access",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      };
    case "staff":
    default:
      return {
        label: "Staff",
        level: "Staff",
        group: groups[0] || "Operations",
        description: "Limited access",
        color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
      };
  }
};

interface UserProfileDropdownProps {
  onLoginClick?: () => void;
}

export function UserProfileDropdown({
  onLoginClick,
}: UserProfileDropdownProps = {}) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <Button
        onClick={onLoginClick}
        className="h-10 px-4 rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 text-primary-foreground font-semibold"
      >
        Login
      </Button>
    );
  }

  const levelInfo = getLevelInfo(user.level, user.groups);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full border border-border hover:bg-accent/5 transition-all duration-200"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 rounded-xl border border-border bg-card shadow-xl"
      >
        {/* Header Section */}
        <div className="px-4 py-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {user.name}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium capitalize border",
                      levelInfo.color
                    )}
                  >
                    {levelInfo.label}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-muted-foreground font-medium">Level</p>
                    <p className="text-foreground font-semibold">
                      {levelInfo.level}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-muted-foreground font-medium">Group</p>
                    <p className="text-foreground font-semibold">
                      {levelInfo.group}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-2 py-2">
          <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent/5 transition-colors">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Account Settings</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Logout */}
        <div className="px-2 py-2">
          <DropdownMenuItem
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md text-red-600 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
