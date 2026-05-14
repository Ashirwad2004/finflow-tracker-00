import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/core/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// LoginForm
// ─────────────────────────────────────────────────────────────────────────────
export const LoginForm = ({ onToggleForgot }: { onToggleForgot: () => void }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (err: any) {
      if (err.message === "Invalid login credentials") {
        toast.error("Invalid login credentials. If you just signed up, please make sure you verified your email address.");
      } else {
        toast.error(err.message || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input 
          id="login-email" 
          type="email" 
          placeholder="name@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required 
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={onToggleForgot}>
            Forgot password?
          </Button>
        </div>
        <div className="relative">
          <Input 
            id="login-password" 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required 
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !email || !password}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sign In
      </Button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SignupForm
// ─────────────────────────────────────────────────────────────────────────────
export const SignupForm = () => {
  const { signUp, signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    setLoading(true);
    try {
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) throw signUpError;

      // Automatically log the user in right after signing up
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        // If login fails right after signup, it usually means Supabase is configured
        // to require email confirmation before logging in.
        if (signInError.message.includes("Invalid login credentials")) {
          toast.success("Account created! Please check your email to verify your account.");
        } else {
          throw signInError;
        }
      } else {
        toast.success("Account created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input 
          id="signup-name" 
          placeholder="John Doe" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input 
          id="signup-email" 
          type="email" 
          placeholder="name@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input 
            id="signup-password" 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required 
            minLength={6}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !email || !password || !name}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Account
      </Button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ForgotPasswordForm
// ─────────────────────────────────────────────────────────────────────────────
export const ForgotPasswordForm = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setSuccess(true);
      toast.success("Reset link sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <p className="text-muted-foreground">We've sent a password reset link to your email address.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email Address</Label>
        <Input 
          id="forgot-email" 
          type="email" 
          placeholder="name@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required 
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !email}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send Reset Link
      </Button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordForm
// ─────────────────────────────────────────────────────────────────────────────
export const ResetPasswordForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="reset-password">New Password</Label>
        <Input 
          id="reset-password" 
          type="password" 
          placeholder="••••••••" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          required 
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !newPassword}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Update Password
      </Button>
    </form>
  );
};
