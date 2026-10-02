import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PricingAuthCardProps {
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  authName: string;
  setAuthName: (val: string) => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authLoading: boolean;
  authError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const PricingAuthCard: React.FC<PricingAuthCardProps> = ({
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authLoading,
  authError,
  onSubmit,
}) => {
  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Sign In to Continue</h3>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`px-2.5 py-1 rounded-lg font-semibold ${
              authMode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className={`px-2.5 py-1 rounded-lg font-semibold ${
              authMode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Log In
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {authMode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="authName" className="text-xs text-foreground">
              Name
            </Label>
            <Input
              id="authName"
              type="text"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="Your name"
              required
              className="bg-background border-input rounded-xl text-sm"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="authEmail" className="text-xs text-foreground">
            Email
          </Label>
          <Input
            id="authEmail"
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="you@email.com"
            required
            className="bg-background border-input rounded-xl text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="authPassword" className="text-xs text-foreground">
            Password
          </Label>
          <Input
            id="authPassword"
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password (min 8 chars)"
            required
            minLength={8}
            className="bg-background border-input rounded-xl text-sm"
          />
        </div>

        {authError && (
          <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
            {authError}
          </div>
        )}

        <Button
          type="submit"
          disabled={authLoading}
          className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl"
        >
          {authLoading ? "Processing..." : authMode === "signup" ? "Create Account & Proceed" : "Sign In & Proceed"}
        </Button>
      </form>
    </div>
  );
};
