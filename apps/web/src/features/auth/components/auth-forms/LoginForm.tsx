import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { normalizeEmail } from "./constants";
import { PasswordToggle } from "./PasswordToggle";

interface LoginFormProps {
  onToggleForgot: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleForgot }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = normalizeEmail(email).length > 0 && password.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (err: any) {
      const message =
        err?.message === "Invalid login credentials"
          ? "Email or password is incorrect. If you just signed up, verify your email first."
          : err?.message || "Unable to sign in. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="login-email">Work email</Label>
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onToggleForgot}>
            Forgot password?
          </Button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pr-10"
            required
          />
          <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-primary" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>

      <div className="mt-4 text-center text-xs">
        <Link to="/salesman-login" className="text-muted-foreground hover:text-primary font-semibold transition-colors">
          Are you a salesman? Sign in here
        </Link>
      </div>
    </form>
  );
};
