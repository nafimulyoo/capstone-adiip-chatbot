"use client";

import React from "react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ isOpen, onOpenChange }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@knowpedia.com");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setIsLoading(true);
    // Simulate a short delay for login
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      await login(email, password);
      onOpenChange(false);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <DialogHeader className="space-y-1 text-center">
          <DialogTitle className="text-2xl font-bold">
            Welcome to KnowPedia
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Sign in to access your knowledge base
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-10 rounded-lg border border-border bg-background placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-10 rounded-lg border border-border bg-background placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="rounded-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Demo Credentials */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-semibold text-foreground mb-2">
              Demo Credentials:
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>Staff:</strong> staff@knowpedia.com / staff123
              </p>
              <p>
                <strong>Manager:</strong> manager@knowpedia.com / manager123
              </p>
              <p>
                <strong>Director:</strong> director@knowpedia.com / director123
              </p>
              <p>
                <strong>Admin:</strong> admin@knowpedia.com / admin123
              </p>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <Button
          onClick={handleLogin}
          disabled={isLoading || !email.trim() || !password.trim()}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-semibold"
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
