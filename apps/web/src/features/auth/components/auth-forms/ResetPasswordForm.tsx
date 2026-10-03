import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/core/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { passwordChecks, passwordIsStrong } from "./constants";
import { PasswordToggle } from "./PasswordToggle";

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordScore = useMemo(() => {
    return passwordChecks.filter((check) => check.test(newPassword)).length;
  }, [newPassword]);

  const passwordsMatch = newPassword === confirmPassword || !confirmPassword;

  const canSubmit = passwordIsStrong(newPassword) && newPassword === confirmPassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Sign out the user to clear the session so they must log in using the new password
      await supabase.auth.signOut({ scope: "global" });

      toast.success("Password updated successfully. Please sign in with your new password.");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <p>Choose a new password that is different from passwords you use elsewhere.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            className="pr-10"
            required
          />
          <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>

        {/* Password Strength Indicators */}
        {newPassword && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex gap-1">
              {passwordChecks.map((check, index) => (
                <span
                  key={check.label}
                  className={`h-1.5 flex-1 rounded-full ${index < passwordScore ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {passwordChecks.map((check) => {
                const passed = check.test(newPassword);
                return (
                  <span key={check.label} className={passed ? "text-emerald-600 animate-in fade-in" : undefined}>
                    {passed ? "✓" : "-"} {check.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Confirm password</Label>
        <Input
          id="reset-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          aria-invalid={!passwordsMatch}
          required
        />
        {!passwordsMatch && (
          <p className="flex items-center gap-1 text-xs text-destructive animate-in fade-in duration-200">
            <AlertCircle className="h-3.5 w-3.5" />
            Passwords do not match.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full bg-gradient-primary" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
};
