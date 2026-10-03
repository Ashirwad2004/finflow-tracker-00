import React from "react";
import { Lock, UserCheck, Loader2, UserPlus, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionInlineAuthProps {
  user: any;
  planName: string;
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  authName: string;
  setAuthName: (name: string) => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authLoading: boolean;
  authError: string;
  onInlineAuth: (e: React.FormEvent) => void;
  onFullAuthRedirect: () => void;
}

export function SubscriptionInlineAuth({
  user,
  planName,
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
  onInlineAuth,
  onFullAuthRedirect,
}: SubscriptionInlineAuthProps) {
  if (user) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">
            Logged in as <span className="font-bold">{user.email}</span>
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border-0"
        >
          Verified
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Authentication Required Before Payment</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Please sign in or create an account to activate your {planName} plan.
          </p>
        </div>
      </div>

      {/* Inline Auth Form */}
      <form onSubmit={onInlineAuth} className="space-y-3 pt-2 border-t border-amber-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            {authMode === "signup" ? "Create Account" : "Sign In"}
          </span>
          <button
            type="button"
            onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
            className="text-primary hover:underline text-[11px] font-medium"
          >
            {authMode === "signup" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>

        {authMode === "signup" && (
          <Input
            type="text"
            placeholder="Full Name"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
            required
            className="h-9 text-xs bg-background"
          />
        )}

        <Input
          type="email"
          placeholder="Email Address"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
          required
          className="h-9 text-xs bg-background"
        />

        <Input
          type="password"
          placeholder="Password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          required
          className="h-9 text-xs bg-background"
        />

        {authError && (
          <p className="text-[10px] text-destructive font-medium">{authError}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={authLoading}
            className="flex-1 h-9 text-xs font-bold bg-primary text-primary-foreground"
          >
            {authLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : authMode === "signup" ? (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Sign Up & Pay
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In & Pay
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onFullAuthRedirect}
            className="h-9 text-xs font-bold"
          >
            Full Auth Page
          </Button>
        </div>
      </form>
    </div>
  );
}
